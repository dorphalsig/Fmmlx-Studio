import {displayContextMenu} from '../controllers/ViewController'; //.js';
import {Class} from '../models/Class';
import {GraphObject, Link, Shape, InputEvent} from 'gojs/release/go-module'; //.js';

const arrowHead = GraphObject.make(
  Shape, // the arrowhead
  {
    toArrow: 'Triangle',
    fill: 'white',
  }
);

const initializers = {
  routing: Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
  reshapable: true,
  resegmentable: true,
  curve: Link.JumpGap,
  contextClick: (event: InputEvent, link: GraphObject) => {
    displayContextMenu({
      mouseEvent: event.event as MouseEvent,
      target2: (link as Link).fromNode!.panel!.data as Class,
    });
    event.handled = true;
  },
};
export const inheritanceShape: Link = GraphObject.make(
  Link,
  initializers,
  GraphObject.make(Shape), // the link shape
  arrowHead
) as Link;
