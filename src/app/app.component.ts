import { Component, HostListener, OnInit, PipeTransform, Type } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard';

class Vec2 {
  x: number;
  y: number;
  constructor(x: number, y: number){
    this.x = x;
    this.y = y;
  }

  compare(v2: Vec2){
    return this.x == v2.x && this.y == v2.y;
  }

  toString() {
    return this.x.toString() + " " + this.y.toString();
  }

  static fromString(str: string) {
    let nums = str.split(" ");
    return new Vec2(parseInt(nums[0]), parseInt(nums[1]));
  }
}

let whitelist: string = "11234567890hpvx/\\~()h*TD^"

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private clipboardApi: ClipboardService) { }

  tab: [string[], string[], string[], string[], string[], string[]] = [[], [], [], [], [], []];
  maxNaturalWidth = 0;
  maxWidth: number = 0;
  pointer: Vec2 = new Vec2(0, 0);
  edits: Map<string, string> = new Map<string, string>();
  undos: [Vec2, string][] = [];
  redos: [Vec2, string][] = [];
  moved: boolean = true;
  ruler: string = "";
  jumps = 0;
  lineWidth = 70;
  editing: boolean = true;
  getData: boolean = false;
  loadData: string = ""

  ngOnInit(): void {
    this.maxWidth = 0;
    this.calcTab();
  }

  redo() {
    let revertData = this.redos.pop()
    if (!revertData) return;
    this.pointer = revertData[0]
    if (revertData[1] == "-"){
      this.removeElem("redo")
    }
    else {
      this.addElem(revertData[1], "redo")
    }
  }

  undo() {
    let revertData = this.undos.pop()
    if (!revertData) return;
    this.pointer = revertData[0]
    if (revertData[1] == "-"){
      this.removeElem("undo")
    }
    else {
      this.addElem(revertData[1], "undo")
    }
  }

  calcTab(serialize: boolean = false) {
    let pad = 51
    if (serialize){
      pad = 1
    }
      this.tab[0] = new Array(this.maxWidth + pad).join("-").split("");
      this.tab[1] = new Array(this.maxWidth + pad).join("-").split("");
      this.tab[2] = new Array(this.maxWidth + pad).join("-").split("");
      this.tab[3] = new Array(this.maxWidth + pad).join("-").split("");
      this.tab[4] = new Array(this.maxWidth + pad).join("-").split("");
      this.tab[5] = new Array(this.maxWidth + pad).join("-").split("");
    
    for (let coords of this.edits.keys()){
      let key = this.edits.get(coords)!;
      let vec = Vec2.fromString(coords);
      this.tab[vec.y][vec.x] = key;
    }

    let count = 0;
    let printStr = ""
    while ((count / 2) + 1 < this.tab[0].length){
      if (count % 20 != 0){
        printStr += " "
      }
      else{
        let nxt = Math.floor(count / 20).toString()
        printStr += nxt
        count += nxt.length - 1
      }
      count++;
    }
    this.ruler = printStr;
  }

  addElem(elem: string, trackUndo: string = "") {
    this.maxWidth = Math.max(this.pointer.x, this.maxWidth);
    this.maxNaturalWidth = Math.max(this.pointer.x, this.maxNaturalWidth);
    let prevElem = this.edits.get(this.pointer.toString());
    this.edits.set(this.pointer.toString(), elem);

    this.calcTab();
    if (trackUndo == "undo"){
      this.redos.push([this.pointer,  prevElem ? prevElem : "-"])
    }
    else if (trackUndo == "redo"){
      this.undos.push([this.pointer,  prevElem ? prevElem : "-"])
    }
    else{
      this.undos.push([this.pointer,  prevElem ? prevElem : "-"])
      this.redos = []
    }
  }

  removeElem(trackUndo: string = "") {
    let prevElem = this.edits.get(this.pointer.toString());
    if (!prevElem) return;
    this.edits.delete(this.pointer.toString());
    let mx = 0
    for (let edit of this.edits.keys()){
      mx = Math.max(mx, Vec2.fromString(edit).x);
    }
    if (this.maxNaturalWidth == this.maxWidth){
      this.maxWidth = mx < 0 ? 0 : mx;
      this.maxNaturalWidth = this.maxWidth;
    }
    else{
      this.maxNaturalWidth = mx < 0 ? 0 : mx;
    }
    this.calcTab();
    if (prevElem){
      if (trackUndo == "undo"){
        this.redos.push([this.pointer, prevElem])
      }
      else if (trackUndo == "redo"){
        this.undos.push([this.pointer, prevElem])
      }
      else{
        this.undos.push([this.pointer, prevElem])
        this.redos = []
      }
    }
    
  }

  @HostListener('window:keydown',['$event'])
  onKeyPress($event: KeyboardEvent) {
    if(($event.ctrlKey || $event.metaKey) && $event.key == 'z'){
      this.undo()
    }
    else if(($event.ctrlKey || $event.metaKey) && $event.key == 'y'){
      this.redo()
    }
    else if (whitelist.includes($event.key) && this.editing){
      if (!this.moved && this.tab[this.pointer.y][this.pointer.x] != "-"){
        this.pointer.x++;
      }
      this.addElem($event.key)
      this.moved = false;
    }
    else if ($event.key == "-"){
      this.removeElem()
    }
  }

  onTabClick(event: MouseEvent){
    var target = event.target || event.currentTarget; 
    if (!target) return;
    var idAttr = (event.target as Element).id;
    this.pointer = Vec2.fromString(idAttr);
    this.moved = true;
  }

  expandTab() {
    this.maxWidth += 50;
    this.calcTab();
  }

  prune(serialize: boolean = false) {
    this.maxWidth = this.maxNaturalWidth;
    this.calcTab(serialize);
  }

  save() {
    if (this.lineWidth === null || this.lineWidth <= 2){
      alert("Invalid line width!!!")
      return
    }

    this.prune(true)

    let slicedStrings: [string[], string[], string[], string[], string[], string[]] = [[], [], [], [], [], []];
    let strCount = 0;
    let trueWidth = this.lineWidth - 2
    for (let tabString of this.tab){
      let slicedString: string[] = []
      let tempStr: string = "-"
      let count = 0
      for (let chr of tabString){
        tempStr += chr;
        if (count == trueWidth - 1){
          tempStr += "-\n";
          slicedString.push(tempStr);
          tempStr = "-";
          count = 0;
          continue;
        }
        count++;
      }
      if (tempStr != "-"){
        while (tempStr.length <= trueWidth){
          tempStr += "-";
        }
        tempStr += "-\n";
        slicedString.push(tempStr);
      }
      slicedStrings[strCount] = (slicedString)
      slicedString = []
      strCount++;
    }

    let count = 0
    let finalString = ""
    while (count < slicedStrings[0].length){
      finalString += slicedStrings[0][count];
      finalString += slicedStrings[1][count];
      finalString += slicedStrings[2][count];
      finalString += slicedStrings[3][count];
      finalString += slicedStrings[4][count];
      finalString += slicedStrings[5][count];
      finalString += "\n\n"
      count++;
    }
    this.clipboardApi.copyFromContent(finalString)
    this.calcTab()
  }

  jump() {
    if (this.jumps === null || this.jumps < 0){
      alert("Invalid jump column!!!")
      return
    }
    if (this.jumps > this.maxNaturalWidth + 2000){
      alert("You can't jump so far ahead!!")
      return
    }
    this.pointer.x = this.jumps
    if (this.pointer.x > this.maxWidth){
      this.maxWidth = this.pointer.x
      this.calcTab()
    }
  }

  detectIfEditing(edit: boolean) {
    this.editing = edit;
  }

  clear() {
    if (this.edits.size != 0 && !confirm("The current tablature will be deleted, are you sure?")) return;
    this.edits.clear();
    this.maxNaturalWidth = 0;
    this.prune();
  }

  openLoad() {
    this.getData = true;
    this.editing = false;
  }

  load() {
    this.getData = false;
    let segs = this.loadData.split("\n")
    segs = segs.filter((elem) => elem != "")

    let count = 0;
    let tempTab: [string, string, string, string, string, string] = ["", "", "", "", "", ""]
    try{
      while (count < segs.length) {
        tempTab[0] += segs[count].slice(1, -1);
        tempTab[1] += segs[count + 1].slice(1, -1);
        tempTab[2] += segs[count + 2].slice(1, -1);
        tempTab[3] += segs[count + 3].slice(1, -1);
        tempTab[4] += segs[count + 4].slice(1, -1);
        tempTab[5] += segs[count + 5].slice(1, -1);
        count += 6;
      }
    }catch (TypeError){
      this.editing = true;
      return;
    }
    
    if (this.edits.size != 0 && !confirm("The current tablature will be deleted, are you sure?")){
      this.editing = true;
      return;
    }

    this.edits.clear()
    this.maxNaturalWidth = 0;
    let x = 0, y = 0;
    for (let seg of tempTab){
      for (let elem of seg){
        if (elem != "-" && whitelist.includes(elem)){
          this.edits.set(new Vec2(x, y).toString(), elem);
          this.maxNaturalWidth = Math.max(x, this.maxNaturalWidth);
        }
        x++;
      }
      y++;
      x = 0;
    }

    this.editing = true;
    this.prune();
  }
}