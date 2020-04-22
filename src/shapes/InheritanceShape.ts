import * as go from 'gojs';

const arrowHead = go.GraphObject.make(
  go.Shape, // the arrowhead
  {
    toArrow: 'Triangle',
    fill: 'white',
  }
);
//@todo handle click events properly
const initializers = {
  routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
  reshapable: true,
  resegmentable: true,
  curve: go.Link.JumpGap,
  //contextClick: Controller.FormController.displayContextMenu,
};
export const inheritanceShape = go.GraphObject.make(
  go.Link,
  initializers,
  go.GraphObject.make(go.Shape), // the link shape
  arrowHead
) as go.Link;

