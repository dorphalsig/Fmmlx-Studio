import * as go from 'gojs';

export class InheritanceShape {
  static get shape() {
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
    return go.GraphObject.make(
      go.Link,
      initializers,
      go.GraphObject.make(go.Shape), // the link shape
      arrowHead
    );
  }
}
