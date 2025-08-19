declare module "cm-chessboard/src/Chessboard.js" {
  export type Color = "w" | "b";

  // prettier-ignore
  export type Square =
    | "a8" | "b8" | "c8" | "d8" | "e8" | "f8" | "g8" | "h8" 
    | "a7" | "b7" | "c7" | "d7" | "e7" | "f7" | "g7" | "h7" 
    | "a6" | "b6" | "c6" | "d6" | "e6" | "f6" | "g6" | "h6" 
    | "a5" | "b5" | "c5" | "d5" | "e5" | "f5" | "g5" | "h5" 
    | "a4" | "b4" | "c4" | "d4" | "e4" | "f4" | "g4" | "h4" 
    | "a3" | "b3" | "c3" | "d3" | "e3" | "f3" | "g3" | "h3" 
    | "a2" | "b2" | "c2" | "d2" | "e2" | "f2" | "g2" | "h2" 
    | "a1" | "b1" | "c1" | "d1" | "e1" | "f1" | "g1" | "h1";

  export const COLOR: { white: "w"; black: "b" } = {
    white: "w",
    black: "b",
  };

  export const INPUT_EVENT_TYPE = {
    moveInputStarted: "moveInputStarted",
    movingOverSquare: "movingOverSquare",
    validateMoveInput: "validateMoveInput",
    moveInputCanceled: "moveInputCanceled",
    moveInputFinished: "moveInputFinished",
  };

  // I am way too lazy for these, sorry...
  export type Config = any;
  export type ChessboardInstance = any;
  export const Chessboard: any;
}
declare module "cm-chessboard/src/extensions/markers/Markers.js" {
  export const Markers: any;
  export const MARKER_TYPE = {
    frame: { class: "marker-frame", slice: "markerFrame" },
    framePrimary: { class: "marker-frame-primary", slice: "markerFrame" },
    frameDanger: { class: "marker-frame-danger", slice: "markerFrame" },
    circle: { class: "marker-circle", slice: "markerCircle" },
    circlePrimary: { class: "marker-circle-primary", slice: "markerCircle" },
    circleDanger: { class: "marker-circle-danger", slice: "markerCircle" },
    circleDangerFilled: {
      class: "marker-circle-danger-filled",
      slice: "markerCircleFilled",
    },
    square: { class: "marker-square", slice: "markerSquare" },
    dot: { class: "marker-dot", slice: "markerDot", position: "above" },
    bevel: { class: "marker-bevel", slice: "markerBevel" },
  };
}
declare module "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js" {
  export const PromotionDialog: any;
}
declare module "cm-chessboard/src/extensions/html-layer/HtmlLayer.js" {
  export const HtmlLayer: any;
}
