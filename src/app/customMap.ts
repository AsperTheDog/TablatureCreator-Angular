

export class Vec2 {
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