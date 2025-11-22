/// <reference types="vite/client" />

declare module 'three-spritetext' {
  import { Object3D } from 'three';
  export default class SpriteText extends Object3D {
    constructor(text?: string, textHeight?: number, color?: string);
    text: string;
    textHeight: number;
    color: string;
    fontFace: string;
    fontWeight: string;
    fontSize: number;
    strokeWidth: number;
    strokeColor: string;
  }
}