<template>
  <div class="draw-box">
    <canvas id="drawCanvas" ref="drawCanvas"></canvas>
    <article class="sc-toolbar">
      <div class="sc-items" :class="{'sc-items-select': item.type === drawType}" v-for="item in toolbar" :key="item.type" @click="selectType(item.type)">
        <i class="sc-items-icon" :class="item.icon"></i>
        {{item.name}}
      </div>
    </article>
  </div>
</template>

<script>
import { fabric } from 'fabric';
export default {
  name: 'draw-box',
  data() {
    return {
      //画板信息
      currentDrawBoard: {
        canvas: null,
        textbox: null,
        canvasState: null,
        drawingObject: null, //绘制对象
        undoList: [], //恢复数组
        redoList: [] //撤销数组
      },
      mouseFrom: {}, //鼠标坐标起点
      mouseTo: {}, //鼠标弹起终点
      moveCount: 1,
      isSaveState: false, //是否存储画板状态
      drawType: 'paintBrush', //绘制类型
      drawColor: '#000000', //笔触颜色
      drawWidth: 2, //笔触宽度
      //画板工具栏
      toolbar: [
        {
          type: 'move',
          name: '移动',
          icon: 'icon_kpl_Selected_Normal'
        },
        {
          type: 'text',
          name: '文本',
          icon: 'icon_kpl_Text_Normal'
        },
        {
          type: 'paintBrush',
          name: '画笔',
          icon: 'icon_kpl_Draw_Brush_Normal'
        },
        {
          type: 'line',
          name: '直线',
          icon: 'icon_kpl_Draw_Line_Normal'
        },
        {
          type: 'singleArrow',
          name: '单箭头',
          icon: 'icon_kpl_Draw_Arrow_Normal'
        },
        {
          type: 'doubleArrow',
          name: '双箭头',
          icon: 'icon_kpl_Draw_DoubleArrow_Normal'
        },
        {
          type: 'rectangle',
          name: '矩形',
          icon: 'icon_kpl_Draw_Rectangular_Normal'
        },
        {
          type: 'circle',
          name: '圆形',
          icon: 'icon_kpl_Draw_Circle_Normal'
        },
        {
          type: 'remove',
          name: '橡皮',
          icon: 'icon_kpl_Eraser_Normal'
        },
        {
          type: 'revoke',
          name: '撤销',
          icon: 'icon_kpl_Undo_Normal'
        },
        {
          type: 'recovery',
          name: '重做',
          icon: 'icon_kpl_Redo_Normal'
        },
        {
          type: 'clear',
          name: '清空',
          icon: 'icon_kpl_Delete_Normal'
        }
      ]
    };
  },
  mounted() {
    let parentDom = document.querySelector('.draw-box');
    let params = {
      id: 'drawCanvas',
      dW: parentDom.clientWidth,
      dH: parentDom.clientHeight
    };
    this.initBoard(params);
  },
  methods: {
    initBoard({ id, dW, dH }) {
      this.currentDrawBoard.canvas = new fabric.Canvas(id, {
        width: dW,
        height: dH,
        isDrawingMode: true,
        perPixelTargetFind: false,
        skipTargetFind: true,
        selectable: false,
        selection: false
      });
      this.currentDrawBoard.canvas.freeDrawingBrush.color = this.drawColor; //设置自由绘颜色
      this.currentDrawBoard.canvas.freeDrawingBrush.width = this.drawWidth; //设置自由绘制笔触大小
      this.addDrawBoradEventListener();
    },
    //画板事件监听
    addDrawBoradEventListener() {
      this.currentDrawBoard.canvas.on('mouse:down', options => {
        let xy = this.transformMouse(options.e.offsetX, options.e.offsetY);
        this.mouseFrom.x = xy.x;
        this.mouseFrom.y = xy.y;
        this.doDrawing = true;
        if (this.drawType === 'text') {
          //判断是不是文本输入
          this.textInput();
        }
      });
      this.currentDrawBoard.canvas.on('mouse:up', options => {
        let xy = this.transformMouse(options.e.offsetX, options.e.offsetY);
        this.mouseTo.x = xy.x;
        this.mouseTo.y = xy.y;
        this.moveCount = 1;
        this.currentDrawBoard.drawingObject = null;
        this.doDrawing = false;
        if (this.isSaveState) {
          this.saveState();
        }
        this.isSaveState = false;
      });
      this.currentDrawBoard.canvas.on('mouse:move', options => {
        if (this.moveCount % 2 && !this.doDrawing) {
          //减少绘制频率
          return;
        }
        this.moveCount++;
        let xy = this.transformMouse(options.e.offsetX, options.e.offsetY);
        this.mouseTo.x = xy.x;
        this.mouseTo.y = xy.y;
        if (this.drawType !== 'paintBrush' && this.drawType !== 'remove' && this.drawType !== 'move') {
          this.drawing();
        }
      });
      this.currentDrawBoard.canvas.on('selection:created', e => {
        if (this.drawType === 'remove') {
          if (e.target._objects) {
            //多选删除
            var etCount = e.target._objects.length;
            for (let etindex = 0; etindex < etCount; etindex++) {
              this.currentDrawBoard.canvas.remove(e.target._objects[etindex]);
            }
          } else {
            //单选删除
            this.currentDrawBoard.canvas.remove(e.target);
          }
          this.currentDrawBoard.canvas.discardActiveObject(); //清楚选中框
        }
      });
      this.currentDrawBoard.canvas.on('object:modified', e => {
        console.log('画布更新');
        this.isSaveState = true;
      });
      this.currentDrawBoard.canvas.on('object:added', e => {
        // console.log("added");
        this.isSaveState = true;
      });
      this.currentDrawBoard.canvas.on('object:removed', e => {
        // console.log("removed");
        this.isSaveState = true;
      });
      this.currentDrawBoard.canvas.on('object:rotating', e => {
        // console.log("rotating");
        this.isSaveState = true;
      });
    },
    transformMouse(mouseX, mouseY) {
      return { x: mouseX / 1, y: mouseY / 1 };
    },
    //选择绘制类型
    selectType(type) {
      // 判断当前选中的为文本插入
      if (type !== 'text' && this.currentDrawBoard.textbox) {
        this.currentDrawBoard.textbox.exitEditing();
        this.currentDrawBoard.textbox = null;
      }
      switch (type) {
        case 'clear': //清空
          this.clear();
          break;
        case 'revoke': //撤销
          this.revoke();
          break;
        case 'recovery': //恢复
          this.recovery();
          break;
      }
      //非空画板时清除画板的选中状态
      if (this.currentDrawBoard.canvas && !this.currentDrawBoard.canvas.isEmpty()) {
        this.currentDrawBoard.canvas.discardActiveObject();
        this.currentDrawBoard.canvas.renderAll();
      }
      // 某些功能没有选中状态
      if (type !== 'save' && type !== 'upload' && type !== 'clear' && type !== 'revoke' && type !== 'recovery') {
        this.drawType = type;
      }
      //移动状态或删除状态需保持可配置
      if (this.drawType === 'move' || this.drawType === 'remove') {
        this.currentDrawBoard.canvas.selection = true;
        this.currentDrawBoard.canvas.skipTargetFind = false;
        this.currentDrawBoard.canvas.selectable = true;
      } else {
        this.currentDrawBoard.canvas.skipTargetFind = true; //整个画板元素不能被选中
        this.currentDrawBoard.canvas.selection = false; //画板不显示选中
        this.currentDrawBoard.canvas.selectable = false; // 控件不能被选择，不会被操作
      }
      //自由绘制状态
      if (this.drawType === 'paintBrush') {
        this.currentDrawBoard.canvas.isDrawingMode = true;
      } else {
        this.currentDrawBoard.canvas.isDrawingMode = false;
      }
    },
    //绘制
    drawing() {
      if (this.currentDrawBoard.drawingObject) {
        this.currentDrawBoard.canvas.remove(this.currentDrawBoard.drawingObject);
      }
      let drawType = {
        line: () => this.drawLine(),
        doubleArrow: () => this.drawArrow('doubleArrow'),
        singleArrow: () => this.drawArrow('singleArrow'),
        dottedline: () => this.drawDottedline(),
        rectangle: () => this.drawRectangle(),
        circle: () => this.drawCircle()
      };
      if (drawType[this.drawType]) {
        let canvasObject = {};
        canvasObject = drawType[this.drawType]();
        if (canvasObject) {
          this.currentDrawBoard.canvas.add(canvasObject);
          this.currentDrawBoard.drawingObject = canvasObject;
        }
      }
    },
    //直线
    drawLine() {
      return new fabric.Line([this.mouseFrom.x, this.mouseFrom.y, this.mouseTo.x, this.mouseTo.y], {
        strokeWidth: this.drawWidth, //线宽
        stroke: this.drawColor, //线的颜色
        strokeLineCap: 'round'
      });
    },
    //虚线
    drawDottedline() {
      return new fabric.Line([this.mouseFrom.x, this.mouseFrom.y, this.mouseTo.x, this.mouseTo.y], {
        strokeDashArray: [3, 1], //间隔
        stroke: this.drawColor, //线的颜色
        strokeWidth: this.drawWidth //x线宽
      });
    },
    //箭头
    drawArrow(arrowType) {
      return new fabric.Path(this.drawArrowOptions(this.mouseFrom.x, this.mouseFrom.y, this.mouseTo.x, this.mouseTo.y, 30, 30, arrowType), {
        stroke: this.drawColor,
        fill: 'rgba(255,255,255,0)',
        strokeWidth: this.drawWidth,
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      });
    },
    //矩形
    drawRectangle() {
      let path =
        'M ' +
        this.mouseFrom.x +
        ' ' +
        this.mouseFrom.y +
        ' L ' +
        this.mouseTo.x +
        ' ' +
        this.mouseFrom.y +
        ' L ' +
        this.mouseTo.x +
        ' ' +
        this.mouseTo.y +
        ' L ' +
        this.mouseFrom.x +
        ' ' +
        this.mouseTo.y +
        ' L ' +
        this.mouseFrom.x +
        ' ' +
        this.mouseFrom.y +
        ' z';
      return new fabric.Path(path, {
        left: undefined,
        top: undefined,
        stroke: this.drawColor,
        strokeWidth: this.drawWidth,
        fill: this.filled ? this.drawColor : 'rgba(255, 255, 255, 0)',
        strokeLineJoin: 'round'
      });
    },
    //圆
    drawCircle() {
      let left = this.mouseFrom.x,
        top = this.mouseFrom.y;
      let radius = Math.sqrt((this.mouseTo.x - left) * (this.mouseTo.x - left) + (this.mouseTo.y - top) * (this.mouseTo.y - top)) / 2;
      return new fabric.Circle({
        left: (this.mouseTo.x - left) / 2 + left,
        top: (this.mouseTo.y - top) / 2 + top,
        stroke: this.drawColor,
        fill: this.filled ? this.drawColor : 'rgba(255, 255, 255, 0)',
        originX: 'center',
        originY: 'center',
        radius: radius,
        strokeWidth: this.drawWidth
      });
    },
    //文本输入
    textInput() {
      this.currentDrawBoard.textbox = new fabric.Textbox('', {
        left: this.mouseFrom.x,
        top: this.mouseFrom.y,
        width: 150,
        borderDashArray: [3, 1]
      });
      this.currentDrawBoard.canvas.add(this.currentDrawBoard.textbox);
      this.currentDrawBoard.textbox.enterEditing();
      this.currentDrawBoard.textbox.hiddenTextarea.focus();
    },
    //清空
    clear() {
      if (!this.currentDrawBoard.canvas.isEmpty()) {
        this.currentDrawBoard.canvas.clear();
        this.currentDrawBoard.canvas.backgroundColor = this.canvasBackground;
        this.saveState();
      }
    },
    //撤销
    revoke() {
      if (this.currentDrawBoard.undoList.length === 0) {
        return;
      }
      this.currentDrawBoard.redoList.push(this.currentDrawBoard.canvasState);
      let lastState = {
        ...this.currentDrawBoard.undoList[this.currentDrawBoard.undoList.length - 1]
      };
      this.currentDrawBoard.canvasState = lastState;
      this.currentDrawBoard.undoList.pop();
      this.currentDrawBoard.canvas.loadFromJSON(lastState, () => {
        this.currentDrawBoard.canvas.renderAll();
      });
    },
    //恢复
    recovery() {
      if (this.currentDrawBoard.redoList.length === 0) {
        return;
      }
      this.currentDrawBoard.undoList.push(this.currentDrawBoard.canvasState);
      let lastState = {
        ...this.currentDrawBoard.redoList[this.currentDrawBoard.redoList.length - 1]
      };
      this.currentDrawBoard.canvasState = lastState;
      this.currentDrawBoard.redoList.pop();
      this.currentDrawBoard.canvas.loadFromJSON(lastState, () => {
        this.currentDrawBoard.canvas.renderAll();
      });
    },
    //保存画布JSON
    saveState() {
      if (this.currentDrawBoard.canvasState) {
        this.currentDrawBoard.undoList.push(this.currentDrawBoard.canvasState);
      }
      this.currentDrawBoard.canvasState = this.currentDrawBoard.canvas.toJSON();
    },
    //绘制箭头参数
    drawArrowOptions(fromX, fromY, toX, toY, theta, headlen, arrowType) {
      theta = typeof theta != 'undefined' ? theta : 30;
      headlen = typeof theta != 'undefined' ? headlen : 10;
      // 计算各角度和对应的P2,P3坐标
      let angle = (Math.atan2(fromY - toY, fromX - toX) * 180) / Math.PI,
        angle1 = ((angle + theta) * Math.PI) / 180,
        angle2 = ((angle - theta) * Math.PI) / 180,
        topX = headlen * Math.cos(angle1),
        topY = headlen * Math.sin(angle1),
        botX = headlen * Math.cos(angle2),
        botY = headlen * Math.sin(angle2);
      let arrowX = fromX - topX,
        arrowY = fromY - topY;
      let path = ' M ' + fromX + ' ' + fromY;
      path += ' L ' + toX + ' ' + toY;
      if (arrowType === 'doubleArrow') {
        //双箭头
        path += ' M ' + arrowX + ' ' + arrowY;
        path += ' L ' + fromX + ' ' + fromY;
        arrowX = fromX - botX;
        arrowY = fromY - botY;
        path += ' L ' + arrowX + ' ' + arrowY;
      }
      arrowX = toX + topX;
      arrowY = toY + topY;
      path += ' M ' + arrowX + ' ' + arrowY;
      path += ' L ' + toX + ' ' + toY;
      arrowX = toX + botX;
      arrowY = toY + botY;
      path += ' L ' + arrowX + ' ' + arrowY;
      return path;
    }
  }
};
</script>

<style lang="scss" scoped>
.draw-box {
  width: 100%;
  height: 100%;
  position: relative;
  .sc-toolbar {
    display: flex;
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    text-align: center;
    position: absolute;
    left: 20px;
    top: 20px;
    .sc-items {
      width: 60px;
      height: 60px;
      display: flex;
      flex-direction: column;
      border-radius: 8px;
      font-size: 12px;
      align-items: center;
      justify-content: center;
      position: relative;
      color: #409eff;
      .sc-items-icon {
        margin-bottom: 2px;
      }
      &:hover {
        cursor: pointer;
        opacity: 0.6;
      }
    }
    .sc-items-select {
      color: #fff;
      background: #409eff;
    }
    .sc-items-active {
      background: rgba(255, 255, 255, 0.2) !important;
    }
  }
}
</style>