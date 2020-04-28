import * as go from 'gojs/release/go-module'; //.js';
import {displayContextMenu} from '../fmmlxstudio'; //.js';
import {Class} from '../models/Class'; //.js';

const arrowHead = go.GraphObject.make(
  go.Shape, // the arrowhead
  {
    toArrow: 'Triangle',
    fill: 'white',
  }
);

const initializers = {
  routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
  reshapable: true,
  resegmentable: true,
  curve: go.Link.JumpGap,
  contextClick: (event: go.InputEvent, link: go.GraphObject) => {
    displayContextMenu({
      mouseEvent: event.event as MouseEvent,
      target2: (link as go.Link).fromNode!.panel!.data as Class,
    });
    event.handled = true;
  },
};
export const inheritanceShape: go.Link = go.GraphObject.make(
  go.Link,
  initializers,
  go.GraphObject.make(go.Shape), // the link shape
  arrowHead
) as go.Link;
