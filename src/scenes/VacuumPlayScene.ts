import Phaser from "phaser";
import { COPY } from "../data/copy";
import { roomById, type FloorType } from "../data/rooms";
import { vacuumById } from "../data/vacuums";
import { audio } from "../systems/AudioEngine";
import { DebrisField } from "../systems/DebrisField";
import { buildRoom, type RoomLayout } from "../systems/RoomLayout";
import { completeRoom, patchSave, persist, save, visitRoom } from "../systems/Save";
import { TouchDrive } from "../systems/TouchDrive";
import { Vacuum } from "../systems/Vacuum";
import { bindSceneResize, composeCamera, getViewport, playHudLayout } from "../systems/Viewport";
import { resolveCircleObstacle } from "../systems/worldGeometry";
import { ActivityHud } from "../ui/ActivityHud";
import { queueVacuumAsset, showLoadOverlay, type LoadOverlay } from "../systems/AssetCatalog";
import { bigButton, labelText } from "../ui/BigButton";
import { rectOf, worldBoundsToScreen, type ActivityDiagnostics } from "../systems/Diagnostics";
import { ActivityLifecycle } from "../systems/ActivityLifecycle";

export class VacuumPlayScene extends Phaser.Scene {
  private room!: RoomLayout;
  private roomId = "living";
  private vacuum!: Vacuum;
  private debris!: DebrisField;
  private drive!: TouchDrive;
  private hud!: ActivityHud;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private cameraFocus!: Phaser.GameObjects.Zone;
  private targetMarker!: Phaser.GameObjects.Graphics;
  private suctionFx!: Phaser.GameObjects.Graphics;
  private groomLayers: Phaser.GameObjects.Graphics[] = [];
  private groomSegmentCount = 0;
  private helperOn = false;
  private helperAcc = 0;
  private helperRate = 1;
  private paused = false;
  private celebrated = false;
  private pauseLayer?: Phaser.GameObjects.Container;
  private tutLayer?: Phaser.GameObjects.Container;
  private celeLayer?: Phaser.GameObjects.Container;
  private homeConfirm?: Phaser.GameObjects.Text;
  private lastHomeTap = -10000;
  private cleanedUp = false;
  private trailAcc = 0;
  private impactBits: Phaser.GameObjects.Arc[] = [];
  private padLayer?: Phaser.GameObjects.Container;
  private loading?: LoadOverlay;
  private lifecycle!: ActivityLifecycle;

  diagnostics(): ActivityDiagnostics {
    const viewport = getViewport(this);
    const hud = this.hud.bounds();
    return {
      viewport: { width: viewport.width, height: viewport.height },
      playableRect: hud.playableRect,
      hud,
      camera: { zoom: this.cameras.main.zoom, worldView: rectOf(this.cameras.main.worldView) },
      machine: {
        screenBounds: worldBoundsToScreen(this.vacuum.sprite.getBounds(), this.cameras.main),
        assetMode: this.vacuum.assetMode,
      },
      input: this.drive.diagnostics(),
      lifecycle: this.lifecycle.diagnostics(),
    };
  }

  constructor() { super("vacuum-play"); }

  preload(): void {
    this.loading = showLoadOverlay(this, "Opening the room");
    const data = this.scene.settings.data as { vacuumId?: string } | undefined;
    queueVacuumAsset(this, data?.vacuumId ?? save().selectedVacuum);
  }

  create(): void {
    this.loading?.destroy();
    this.cleanedUp = false;
    this.lifecycle = new ActivityLifecycle(this, "vacuum", {
      pause: () => { if (!this.paused) this.togglePause(); },
      resume: () => { if (this.paused) this.togglePause(); },
      finish: () => this.startFinish(),
      progress: () => this.debris?.percent ?? 0,
    });
    this.lifecycle.addCleanup(() => this.cleanup());
    this.input.addPointer(2);
    this.input.setTopOnly(true);
    this.uiCam = this.lifecycle.uiCamera;
    const data = this.scene.settings.data as { roomId?: string; vacuumId?: string } | undefined;
    this.roomId = data?.roomId ?? "living";
    const roomDef = roomById(this.roomId);
    patchSave({ selectedRoom: roomDef.id, lastActivity: "vacuum" });
    visitRoom(roomDef.id);
    this.room = buildRoom(this, roomDef);
    this.debris = new DebrisField(this, roomDef, this.room.obstacles);
    const def = vacuumById(data?.vacuumId ?? save().selectedVacuum);
    this.vacuum = new Vacuum(this, def, this.room.startX, this.room.startY);
    this.vacuum.heading = -0.2;
    audio.setVacuumProfile(def.motor);
    this.drive = new TouchDrive(this, this.vacuum, (x, y) => this.isWorldInput(x, y));
    this.cameraFocus = this.add.zone(this.vacuum.x, this.vacuum.y, 2, 2);
    this.targetMarker = this.add.graphics().setDepth(2.8);
    this.suctionFx = this.add.graphics().setDepth(4.6);
    this.addGroomLayer();
    this.cameras.main.setBounds(0, 0, this.room.width, this.room.height).startFollow(this.cameraFocus, true, .1, .1).setDeadzone(36,36);
    this.fitZoom();
    this.hud = new ActivityHud(this, {
      home: () => this.goHome(),
      pause: () => this.paused ? this.lifecycle.resume() : this.lifecycle.pause(),
      finish: () => this.lifecycle.finish(),
    }, COPY.cleanFloor);
    if (save().control === "pad") this.buildPad();
    if (!save().seenVacuumTutorial) this.showTutorial();
    this.bindCameras();
    bindSceneResize(this, () => this.relayout());
  }

  update(_time: number, delta: number): void {
    this.lifecycle.frame(delta);
    if (this.paused || this.tutLayer || this.celeLayer) {
      audio.setVacuumState({ throttle: 0, speed: 0, suctionLoad: 0, brush: this.vacuum.def.rig.brushRoll, hardFloor: false });
      return;
    }
    const dt = Math.min(.05, delta / 1000);
    this.drive.update(dt);
    for (const prop of this.room.obstacles) {
      const hit = resolveCircleObstacle(this.vacuum.x, this.vacuum.y, this.vacuum.def.radius, prop);
      this.vacuum.x = hit.x; this.vacuum.y = hit.y;
    }
    this.vacuum.clampTo(this.room.width, this.room.height, 62);
    this.vacuum.update(dt);
    const speedRatio = Math.min(1, this.vacuum.speed / this.vacuum.topSpeed);
    const floor = this.room.floorAt(this.vacuum.x, this.vacuum.y);
    const suctionOn = this.vacuum.throttle > .03 || speedRatio > .04;
    const result = this.debris.clean({
      x: this.vacuum.x, y: this.vacuum.y, heading: this.vacuum.heading,
      intakeWidth: this.vacuum.intakeWidth, intakeDepth: this.vacuum.intakeDepth,
      intakeOffset: this.vacuum.intakeOffset, power: suctionOn ? .72 + this.vacuum.def.motor.airflow * .52 : 0,
    }, dt);
    if (this.helperOn) {
      this.helperAcc += this.helperRate * dt;
      const n = Math.floor(this.helperAcc);
      if (n > 0) { this.helperAcc -= n; if (this.debris.helperStep(n) === 0) this.helperOn = false; }
    }
    this.drawTarget();
    this.drawSuction(result.cleaned);
    this.recordGroom(dt, floor, speedRatio);
    if (result.impacts.length) {
      this.spawnImpacts(result.impacts.length);
      for (const kind of result.impacts.slice(0, 2)) audio.vacuumImpact(kind);
    }
    audio.setVacuumState({ throttle: this.vacuum.throttle, speed: speedRatio, suctionLoad: Math.min(1, result.cleaned * 3.6 + result.impacts.length * .28), brush: this.vacuum.def.rig.brushRoll, hardFloor: floor === "tile" || floor === "hardwood" || floor === "concrete" });
    const lead = save().reducedMotion ? 15 : 38 + speedRatio * 42;
    this.cameraFocus.setPosition(Phaser.Math.Linear(this.cameraFocus.x, this.vacuum.x + Math.cos(this.vacuum.heading) * lead, .075), Phaser.Math.Linear(this.cameraFocus.y, this.vacuum.y + Math.sin(this.vacuum.heading) * lead, .075));
    const p = this.debris.percent;
    this.hud.setProgress(p, p < .01 ? COPY.cleanFloor : `${Math.round(p * 100)}% ${COPY.cleaned}`);
    if (!this.celebrated && p >= .88) this.celebrate();
  }

  private bindCameras(): void {
    const world: Phaser.GameObjects.GameObject[] = [this.room.floor, ...this.room.props, ...this.debris.views.values(), this.vacuum.sprite, this.vacuum.shadow, this.vacuum.rigLayer, this.cameraFocus, this.targetMarker, this.suctionFx, ...this.groomLayers];
    this.uiCam.ignore(world);
    this.cameras.main.ignore(this.hud.container);
    if (this.padLayer) this.cameras.main.ignore(this.padLayer);
    if (this.tutLayer) this.cameras.main.ignore(this.tutLayer);
  }

  private fitZoom(): void {
    const v = getViewport(this);
    const machineLongAxis = Math.max(this.vacuum.sprite.displayWidth, this.vacuum.sprite.displayHeight);
    this.cameras.main.setZoom(composeCamera(v, this.room.width, this.room.height, machineLongAxis, 1.16).zoom).setBackgroundColor("#3c3029");
  }

  private isWorldInput(x: number, y: number): boolean {
    const v = getViewport(this);
    if (this.hud?.containsScreenPoint(x,y)) return false;
    return !(save().control === "pad" && x < 255 && y > v.height - 285);
  }

  private drawTarget(): void {
    const g=this.targetMarker, t=this.drive.target; g.clear(); if(!t)return;
    const r=save().reducedMotion?14:12+Math.sin(this.time.now/110)*3; g.lineStyle(3,0x80deea,.9).strokeCircle(t.x,t.y,r); g.lineStyle(2,0xffffff,.55).strokeCircle(t.x,t.y,r+6);
  }

  private drawSuction(cleaned: number): void {
    const g=this.suctionFx;g.clear(); const c=Math.cos(this.vacuum.heading),s=Math.sin(this.vacuum.heading),px=-s,py=c;
    const ox=this.vacuum.x+c*this.vacuum.intakeOffset, oy=this.vacuum.y+s*this.vacuum.intakeOffset;
    const half=this.vacuum.intakeWidth*.46;
    g.lineStyle(3.2,0xb2ebf2,.34+Math.min(.3,this.vacuum.throttle*.3));
    g.beginPath();g.moveTo(ox-px*half,oy-py*half);g.lineTo(ox+px*half,oy+py*half);g.strokePath();
    if(this.vacuum.def.rig.brushRoll){
      const phase=(this.time.now/70)%12;
      g.lineStyle(2,0xffd54f,.48);
      for(let stripe=-half+phase;stripe<half;stripe+=12){g.beginPath();g.moveTo(ox+px*stripe-c*4,oy+py*stripe-s*4);g.lineTo(ox+px*Math.min(half,stripe+6)+c*4,oy+py*Math.min(half,stripe+6)+s*4);g.strokePath();}
    }
    if(!save().reducedMotion)for(let i=0;i<3;i++){const phase=(this.time.now/360+i/3)%1;const sx=ox+c*(22+phase*58)+px*(-30+i*30),sy=oy+s*(22+phase*58)+py*(-30+i*30),mx=ox+c*24+px*(-18+i*18),my=oy+s*24+py*(-18+i*18),ex=ox+px*(-12+i*12),ey=oy+py*(-12+i*12);g.lineStyle(2.5,0xd7f5ff,(1-phase)*(.26+Math.min(.48,cleaned*2)));g.beginPath();g.moveTo(sx,sy);g.lineTo(mx,my);g.lineTo(ex,ey);g.strokePath();}
  }

  private recordGroom(dt: number, floor: FloorType, speed: number): void {
    if(speed<.08)return;this.trailAcc+=dt;const interval=save().reducedMotion?0.14:0.07;if(this.trailAcc<interval)return;this.trailAcc=0;
    if(this.groomSegmentCount>=60)this.addGroomLayer();
    const g=this.groomLayers.at(-1)!;const carpet=floor==="carpet"||floor==="rug";const concrete=floor==="concrete";const color=carpet?0xe6f1df:concrete?0xc9d0cd:0xffffff;
    const sideX=Math.cos(this.vacuum.heading+Math.PI/2)*this.vacuum.intakeWidth*.4,sideY=Math.sin(this.vacuum.heading+Math.PI/2)*this.vacuum.intakeWidth*.4;
    g.lineStyle(carpet?12:7,color,carpet?.24:concrete?.12:.2);g.beginPath();g.moveTo(this.vacuum.x-sideX,this.vacuum.y-sideY);g.lineTo(this.vacuum.x+sideX,this.vacuum.y+sideY);g.strokePath();
    if(carpet){g.lineStyle(2,0x45644c,.2);g.beginPath();g.moveTo(this.vacuum.x-sideX*.85,this.vacuum.y-sideY*.85);g.lineTo(this.vacuum.x+sideX*.85,this.vacuum.y+sideY*.85);g.strokePath();}
    this.groomSegmentCount++;
  }

  private addGroomLayer(): void {
    const layer=this.add.graphics().setDepth(1.2);this.groomLayers.push(layer);this.groomSegmentCount=0;
    if(this.uiCam)this.uiCam.ignore(layer);
    if(this.groomLayers.length>5)this.groomLayers.shift()?.destroy();
  }

  private startFinish():void{this.helperOn=true;this.helperAcc=0;this.helperRate=Math.max(24,this.debris.remainingCount/8);}

  private spawnImpacts(count:number):void{if(save().reducedMotion)return;for(let i=0;i<Math.min(5,count);i++){const a=this.add.circle(this.vacuum.x+Math.cos(this.vacuum.heading)*this.vacuum.intakeOffset,this.vacuum.y+Math.sin(this.vacuum.heading)*this.vacuum.intakeOffset,3,0xffd54f,.9).setDepth(6);this.uiCam.ignore(a);this.impactBits.push(a);this.tweens.add({targets:a,x:a.x+(Math.random()-.5)*50,y:a.y+(Math.random()-.5)*50,alpha:0,scale:.2,duration:260,onComplete:()=>{a.destroy();this.impactBits=this.impactBits.filter(b=>b!==a);}});}}

  private buildPad():void{this.padLayer=this.add.container(0,0).setDepth(19).setScrollFactor(0);const dirs:["up"|"down"|"left"|"right",string,number,number][]=[["up","▲",0,-68],["down","▼",0,68],["left","◀",-74,0],["right","▶",74,0]];const controls=dirs.map(([dir,label,dx,dy])=>{const c=this.add.circle(dx,dy,44,0x1565c0,.9).setStrokeStyle(3,0xf4f1de).setInteractive();const t=this.add.text(dx,dy,label,{fontSize:"34px",color:"#fff"}).setOrigin(.5);c.on("pointerdown",()=>this.drive.setPad(dir,true));c.on("pointerup",()=>this.drive.setPad(dir,false));c.on("pointerout",()=>this.drive.setPad(dir,false));c.on("pointercancel",()=>this.drive.abortInput());this.padLayer!.add([c,t]);return{c,t,dx,dy};});this.padLayer.setData("controls",controls);this.layoutPad();}
  private layoutPad():void{if(!this.padLayer)return;const v=getViewport(this);this.padLayer.setPosition(v.safe.left+(v.mode==="phone-portrait"?118:132),v.height-v.safe.bottom-(v.mode==="phone-landscape"?102:126));}

  private togglePause():void{if(this.celeLayer||this.tutLayer)return;this.paused=!this.paused;this.drive.abortInput();if(!this.paused){this.pauseLayer?.destroy();this.pauseLayer=undefined;return;}const w=this.scale.width,h=this.scale.height;const layer=this.add.container(0,0).setDepth(30).setScrollFactor(0);const bg=this.add.rectangle(w/2,h/2,w,h,0x18242a,.76).setInteractive();const title=labelText(this,w/2,h/2-80,COPY.pause,42);const go=bigButton(this,w/2,h/2+20,"icon-play",COPY.resume,()=>this.togglePause(),110);layer.add([bg,title,go]);layer.setData("layout",{bg,title,go});this.pauseLayer=layer;this.cameras.main.ignore(layer);}

  private showTutorial():void{const w=this.scale.width,h=this.scale.height,steps=[COPY.vacuumTutorial1,COPY.vacuumTutorial2,COPY.vacuumTutorial3];let i=0;const layer=this.add.container(0,0).setDepth(40).setScrollFactor(0);const bg=this.add.rectangle(w/2,h/2,w,h,0x18242a,.48).setInteractive();const msg=labelText(this,w/2,h-168,steps[0],32);const trail=this.add.rectangle(w/2,h*.46,128,8,0x80deea,.72);const finger=this.add.circle(w/2-62,h*.46,25,0xffd6b5).setStrokeStyle(5,0x5d4037);const tip=this.add.circle(w/2-62,h*.46-25,12,0xffd6b5).setStrokeStyle(4,0x5d4037);if(!save().reducedMotion)this.tweens.add({targets:[finger,tip],x:"+=124",duration:1150,yoyo:true,repeat:-1,ease:"Sine.InOut"});let advance=()=>{};const next=bigButton(this,w/2,h-88,"icon-play",COPY.play,()=>advance(),96);advance=()=>{if(++i>=steps.length){save().seenVacuumTutorial=true;persist();layer.destroy();this.tutLayer=undefined;return;}msg.setText(steps[i]);};bg.on("pointerup",advance);layer.add([bg,trail,finger,tip,msg,next]);layer.setData("layout",{bg,msg,next});this.tutLayer=layer;this.cameras.main.ignore(layer);}

  private celebrate():void{this.drive.abortInput();this.celebrated=true;audio.blip("done");completeRoom(this.roomId);const w=this.scale.width,h=this.scale.height;const layer=this.add.container(0,0).setDepth(35).setScrollFactor(0);const bg=this.add.rectangle(w/2,h/2,w,h,0x18242a,.6).setInteractive();const check=this.add.image(w/2,h/2-70,"icon-check").setDisplaySize(120,120);const msg=labelText(this,w/2,h/2+8,COPY.youDidIt,40);const reward=labelText(this,w/2,h/2+56,`${Math.round(this.debris.percent*100)}% ${COPY.cleaned}`,22);const again=bigButton(this,w/2,h/2+128,"icon-play",COPY.again,()=>this.scene.restart({roomId:this.roomId}),96);const hl=playHudLayout(getViewport(this));const home=bigButton(this,hl.homeX,hl.y,"icon-home",COPY.home,()=>this.goHome(),80).setScale(hl.size/80);layer.add([bg,check,msg,reward,again,home]);layer.setData("layout",{bg,check,msg,reward,again,home});this.celeLayer=layer;this.cameras.main.ignore(layer);}

  private goHome():void{if(save().safeHome&&this.time.now-this.lastHomeTap>1700){this.lastHomeTap=this.time.now;this.homeConfirm?.destroy();const v=getViewport(this);this.homeConfirm=this.add.text(v.safe.left+18,v.safe.top+112,COPY.homeAgain,{fontFamily:"system-ui",fontSize:"20px",fontStyle:"bold",color:"#fff59d",backgroundColor:"rgba(24,36,42,.9)",padding:{x:12,y:8}}).setDepth(42).setScrollFactor(0);this.cameras.main.ignore(this.homeConfirm);this.time.delayedCall(1700,()=>{this.homeConfirm?.destroy();this.homeConfirm=undefined;});return;}audio.stop();this.cleanup();this.scene.start("title");}

  private relayout():void{this.drive.abortInput();const v=getViewport(this);this.lifecycle.resize();this.hud.layout();this.layoutPad();this.fitZoom();const w=v.width,h=v.height;for(const layer of [this.pauseLayer,this.tutLayer]){if(!layer)continue;const r=layer.getData("layout") as {bg:Phaser.GameObjects.Rectangle;title?:Phaser.GameObjects.Text;go?:Phaser.GameObjects.Container;msg?:Phaser.GameObjects.Text;next?:Phaser.GameObjects.Container};r.bg.setPosition(w/2,h/2).setDisplaySize(w,h);r.title?.setPosition(w/2,h/2-80);r.go?.setPosition(w/2,h/2+20);r.msg?.setPosition(w/2,h-168);r.next?.setPosition(w/2,h-88);}if(this.celeLayer){const r=this.celeLayer.getData("layout") as {bg:Phaser.GameObjects.Rectangle;check:Phaser.GameObjects.Image;msg:Phaser.GameObjects.Text;reward:Phaser.GameObjects.Text;again:Phaser.GameObjects.Container;home:Phaser.GameObjects.Container};const hl=playHudLayout(v);r.bg.setPosition(w/2,h/2).setDisplaySize(w,h);r.check.setPosition(w/2,h/2-70);r.msg.setPosition(w/2,h/2+8);r.reward.setPosition(w/2,h/2+56);r.again.setPosition(w/2,h/2+128);r.home.setPosition(hl.homeX,hl.y).setScale(hl.size/80);}}

  private cleanup():void{if(this.cleanedUp)return;this.cleanedUp=true;this.drive?.destroy();this.vacuum?.destroy();this.debris?.destroy();this.room?.destroy();for(const layer of this.groomLayers)layer.destroy();this.groomLayers=[];}
}
