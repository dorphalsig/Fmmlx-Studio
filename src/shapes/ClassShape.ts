import * as Models from '../models/Models';
import * as go from 'gojs';
import {PropertyShape} from './PropertyShape';

export class ClassShape {
  static get externalLanguageBlock() {
    return go.GraphObject.make(
      go.Panel,
      'Auto',
      {
        stretch: go.GraphObject.Fill,
        alignment: new go.Spot(1, 0),
        maxSize: new go.Size(54, Infinity),
        name: 'externalLanguageBlock',
      },
      new go.Binding('visible', '', this.getIsExternal),
      go.GraphObject.make(go.Shape, 'Rectangle', {
        fill: 'orange',
      }),
      go.GraphObject.make(go.TextBlock, new go.Binding('text', 'externalLanguage'), {
        margin: 2,
        wrap: go.TextBlock.None,
        stroke: 'black',
        overflow: go.TextBlock.OverflowEllipsis,
        toolTip: go.GraphObject.make(
          go.Adornment,
          'Auto',
          go.GraphObject.make(go.Shape, {
            fill: '#FFFFCC',
          }),
          go.GraphObject.make(
            go.TextBlock,
            {
              margin: 4,
            },
            new go.Binding('text', 'externalLanguage')
          )
        ), // end of Adornment
      })
    );
  }

  static get mainBlock() {
    return go.GraphObject.make(
      go.Panel,
      'Vertical',
      {name: 'mainBlock'},
      this.nameBlock,
      this.genericBlock('attributes'),
      this.genericBlock('operations'),
      this.genericBlock('slotValues'),
      this.genericBlock('operationValues')
    );
  }

  static get nameBlock() {
    return go.GraphObject.make(
      go.Panel,
      'Auto',
      {
        stretch: go.GraphObject.Fill,
        minSize: new go.Size(100, 20),
        name: 'nameBlock',
      },
      go.GraphObject.make(go.Shape, 'Rectangle', new go.Binding('fill', 'level', this.getBgColor)),
      go.GraphObject.make(
        go.TextBlock,
        new go.Binding('text', '', this.getMetaclassName),
        new go.Binding('font', 'isAbstract', this.getFontStyle),
        new go.Binding('stroke', 'level', this.getFontColor),
        {
          textAlign: 'center',
          margin: 7,
        }
      )
    );
  }

  static get ellipsis() {
    return go.GraphObject.make(go.TextBlock, {
      name: 'ellipsis',
      stretch: go.GraphObject.Fill,
      minSize: new go.Size(100, 20),
      text: '…',
      font: 'bold 20px monospace',
      textAlign: 'center',
      visible: false,
    });
  }
  //@todo add callbacks for clicks and doubleclicks
  static get shape() {
    return go.GraphObject.make(
      go.Node,
      'Spot',
      {
        //  doubleClick: Controller.FormController.displayClassForm,
        //contextClick: Controller.FormController.displayContextMenu,
      },
      new go.Binding('location', 'location', go.Point.parse),
      this.mainBlock,
      this.externalLanguageBlock
    );
  }

  static genericBlock(collectionName: string) {
    return go.GraphObject.make(
      go.Panel,
      'Auto',
      {
        stretch: go.GraphObject.Fill,
        minSize: new go.Size(100, 20),
      },
      go.GraphObject.make(go.Shape, 'Rectangle', {
        fill: 'white',
      }),
      go.GraphObject.make(
        go.Panel,
        'Vertical',
        {
          margin: 4,
          name: collectionName,
          defaultAlignment: go.Spot.Left,
        },
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          {
            name: 'items',
            defaultAlignment: go.Spot.Left,
            itemTemplate: PropertyShape.shape,
          },
          new go.Binding('itemArray', collectionName)
        ),
        this.ellipsis
      )
    );
  }

  /**
   * Specifies background color based on level
   */
  static getBgColor(level: string) {
    if (isNaN(+level)) return '#C45911';
    let color;
    switch (isNaN(+level) || +level) {
      case 0:
        color = '#E6E6E6';
        break;
      case 1:
        color = '#FFFFFF';
        break;
      case 2:
        color = '#000000';
        break;
      case 3:
        color = '#000074';
        break;
      case 4:
        color = '#910000';
        break;
      case 5:
        color = '#007C36';
        break;
      default:
        //6+
        color = '#653C7B';
    }

    return color;
  }

  /**
   *  Returns the font color based on the classification level of the Fmmlx Class
   *  (black for 0 and 1, white all else)
   */
  static getFontColor(level: string) {
    return Number.parseInt(level) < 2 ? '#000000' : '#FFFFFF';
  }

  /**
   * Returns font Style for the name block. if class isAbstract then the style is Oblique
   */
  static getFontStyle(isAbstract: boolean) {
    let font = `15px 'Roboto', sans-serif`;
    if (isAbstract) {
      font = `Italic ${font}`;
    }
    return font;
  }

  static getIsExternal(fmmlxClass: Models.Class) {
    return fmmlxClass.isExternal;
  }

  /**
   *  Gets the name string to display. that is ^^ META ^^ \n Name
   */
  static getMetaclassName(fmmlxClass: Models.Class) {
    return `^${fmmlxClass.metaclassName.toUpperCase()}^\n${fmmlxClass.name} (${fmmlxClass.level})`;
  }
}
