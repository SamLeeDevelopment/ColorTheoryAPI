var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

script.onload = function(){
  $('img').click(function(evt){
    evt.preventDefault();
    colorScheme($(this).attr('src'));
  });
}

function colorScheme(imageSrc){
  //DOM
  var canvas;
  if(document.getElementById('board') == null){
    canvas = document.createElement('canvas');
    canvas.id = "board";
    canvas.style.position = "absolute";
    canvas.style.right = "-1000px";
    canvas.style.top = "0px";
    document.body.style.overflowX = "hidden";
    document.body.appendChild(canvas);
  } else {
    canvas = document.getElementById('board');
  }

  //variables
  var WIDTH = 480, HEIGHT = 480, canvas, ctx, grid = [], cellSize = 40, palette;

  Array.prototype.stanDeviate = function(mean = null){
     var i,j,total = 0, diffSqredArr = [];
     for(i=0;i<this.length;i+=1){
         total+=this[i];
     }
     mean = mean == null ? total/this.length : mean;
     for(j=0;j<this.length;j+=1){
         diffSqredArr.push(Math.pow((this[j]-mean),2));
     }
     return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
              return firstEl + nextEl;
            })/this.length));
  }

  //bin size optimization
  var bin_size = 0;
  /*
  *
  * This algorithm was derived from research conducted by Shimazaki and Shinomoto. Neural Comput, 2007, 19(6), 1503-1527
  * Learn more: http://176.32.89.45/~hideaki/res/histogram.html
  */
  //--------------------------
  function getHistogram(data, b=bin_size){
    var histogram = {
      bins: []
    }
    var max = Math.max.apply(null, data);
    var min = Math.min.apply(null, data);

    var N = Math.ceil((max-min)/b);
    for(var i = 0; i < N; i++){
      var bin = new Object();
      bin.start = min+i*b;
      bin.end = bin.start+b;
      bin.data = new Array();

      histogram.bins.push(bin);
    }
    for(var i = 0; i < data.length; i++){
      for(var k = 0; k < histogram.bins.length; k++){
        if(data[i] >= histogram.bins[k].start && data[i] < histogram.bins[k].end){
          histogram.bins[k].data.push(data[i]);
        }
      }
    }
    return histogram;
  }
  function getK(histogram){
    var total = 0;
    for(var i = 0; i < histogram.bins.length; i++){
      total += histogram.bins[i].data.length;
    }
    return total/histogram.bins.length;
  }
  function getV(histogram){
    var k = getK(histogram);
    var total = 0;
    for(var i = 0; i < histogram.bins.length; i++){
      total += (k-histogram.bins[i].data.length)*(k-histogram.bins[i].data.length); //(k - ki)^2
    }
    return total/histogram.bins.length;
  }
  function cost(histogram, b){
    var k = getK(histogram);
    var v = getV(histogram);
    return ((2*k - v)/(b*b));
  }
  function getCosts(data){
    var costs = [];
    const step = 0.01;
    for(var i = 10; i < 50; i += step){
      var optimum = new Object();
      optimum.b = i;
      optimum.cost = cost(getHistogram(data, i), i);

      costs.push(optimum);
    }
    return costs;
  }
  function getBinSize(data){
    var costs = getCosts(data);
    //console.log(costs);

    var minCost = costs[0].cost;
    var b = costs[0].b;
    for(var i = 1; i < costs.length; i++){
      if(costs[i].cost < minCost){
        minCost = costs[i].cost;
        b = costs[i].b;
      }
    }
    return b;
  }

  //color scheme
  ctx = canvas.getContext('2d');
  canvas.height = HEIGHT;
  canvas.width = WIDTH;

  palette = new Image();
  palette.src = imageSrc;
  //console.log(palette);
  palette.onload = function(){
    init();
  }

  var dark = [];
  var light = [];

  function getStdDev(arr){
    if(arr.length > 1){
      var scores = [];
      for(var i = 0; i < arr.length; i++){
          scores.push(getScore(hexToRgba(arr[i])));
      }
      return scores.stanDeviate();
    } else {
      return 0;
    }
  }

  function hexToRgba(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
          a: 1
      } : null;
  }

  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  function inGrid(arr, cell){
    for(var i = 0; i < arr.length; i++){
      for(var j = 0; j < arr[i].length; j++){
        if(Object.is(cell, arr[i][j])){
          return true;
        }
      }
    }
    return false;
  }

  function inBin(arr, s){
    for(var i = 0; i < arr.length; i++){
      if(Math.abs(s - getScore(hexToRgba(arr[i]))) <= bin_size){
        return true;
      }
    }
    return false;
  }

  function getScore(c){
    return Math.sqrt((c.r**2+c.g**2+c.b**2));
  }

  var anchors = {light: null, dark: null};

  var sorted = [];

  function getColor(x, y){
    var total = {r: 0, g: 0, b: 0};

    for(var i = 0; i < cellSize; i++){
      for(var j = 0; j < cellSize; j++){
          total.r += Math.pow(ctx.getImageData(x+j, y+i, 1, 1).data[0], 2);
          total.g += Math.pow(ctx.getImageData(x+j, y+i, 1, 1).data[1], 2);
          total.b += Math.pow(ctx.getImageData(x+j, y+i, 1, 1).data[2], 2);
      }
    }

    total.r = Math.round(Math.sqrt(total.r/cellSize/cellSize));
    total.g = Math.round(Math.sqrt(total.g/cellSize/cellSize));
    total.b = Math.round(Math.sqrt(total.b/cellSize/cellSize));

    var color = rgbToHex(total.r, total.g, total.b);

    return color;
  }

  function fillShades(){
    for(var i = 0; i < grid.length; i++){
      for(var j = 0; j < grid[i].length; j++){
        var c = hexToRgba(grid[i][j].color);
        var score = getScore(c);
        sorted.push(score);
      }
    }
    sorted = sorted.sort(function(a, b){return a-b});

    /* ########### INITIALIZE BIN SIZE ##################
    *
    *
    */
                bin_size = getBinSize(sorted);
    /*
    *
    *
    * #################################################### */

    var stdv = sorted.stanDeviate()*2;

    var scrambled = [];
    for (i = 0; i < grid.length; i++) { //scramble to increase diversity
      scrambled.push(new Array());
      for (j = 0; j < grid[i].length; j++) {
        var rand = grid[Math.round(Math.random()*(grid.length-1))][Math.round(Math.random()*(WIDTH/cellSize-1))];
        while(inGrid(scrambled, rand)){
          rand = grid[Math.round(Math.random()*(grid.length-1))][Math.round(Math.random()*(WIDTH/cellSize-1))];
        }
        scrambled[i].push(rand);
      }
    }

    var lightAnchor = sorted[Math.min(Math.round((0.85+((0.5-Math.random())/2.5))*sorted.length),sorted.length-1)];
    anchors.light = lightAnchor;
    //stdv = sorted.stanDeviate(lightAnchor)*2;

    var exit = false, counter = 0;
    while(!exit){
      var i = Math.round(Math.random()*(scrambled.length-1));
      var j = Math.round(Math.random()*(WIDTH/cellSize-1));

      var c = hexToRgba(scrambled[i][j].color);
      var score = getScore(c);

      if((score <= lightAnchor+stdv && score >= lightAnchor-stdv) && !inBin(light, score)){
        if(light.length >= 5){
          exit = true;
        } else {
          light.push(scrambled[i][j].color);
        }
      }
      counter++;
      if(100*counter/(WIDTH*HEIGHT/(cellSize*cellSize)*(bin_size+1)) >= 100){
        break;
      }
    }


    var darkAnchor = sorted[Math.max(Math.round((0.15+((0.5-Math.random())/2.5))*sorted.length), 0)];
    //stdv = sorted.stanDeviate(darkAnchor)*2;
    anchors.dark = darkAnchor;
    exit = false, counter = 0;
    while(!exit){
      var i = Math.round(Math.random()*(scrambled.length-1));
      var j = Math.round(Math.random()*(WIDTH/cellSize-1));

      var c = hexToRgba(scrambled[i][j].color);
      var score = getScore(c);
      if((score <= darkAnchor+stdv && score >= darkAnchor-stdv) && !inBin(dark, score)){
        if(dark.length >= 5){
          exit = true;
        } else {
          dark.push(scrambled[i][j].color);
        }
      }
      counter++;
      if(100*counter/(WIDTH*HEIGHT/(cellSize*cellSize)*(bin_size+1)) >= 100 ){
        break;
      }
    }
    display(dark, light);
  }

  function init(){
    //draw image off canvas
    ctx.drawImage(palette, 0, 0, WIDTH, HEIGHT);

    //create grid
    for(var i = 0; i < HEIGHT/cellSize; i++){
      grid.push(new Array());
      for(var j = 0; j < WIDTH/cellSize; j++){
        var cell = {
          x: j*cellSize,
          y: i*cellSize,
          width: cellSize,
          height: cellSize,
          selected: false,
          color: getColor(j*cellSize, i*cellSize),
          draw: function(){
            ctx.fillStyle = this.color;
            //console.log(this.color);
            ctx.fillRect(this.x, this.y, this.width, this.height);
          }
        }
        grid[i].push(cell);
      }
    }
    function draw(){
      //draw grid
      for(var i = 0; i < grid.length; i++){
        for(var j = 0; j < grid[i].length; j++){
          grid[i][j].draw();
        }
      }
    }
    draw();

    fillShades();
  }
}
var dark, light;
function display(d, l){
  dark = d;
  light = l
}
