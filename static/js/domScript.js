var scaleFactor;
var itemHeight = 20;
var puffer = 60;

var sentTx = false;

var numberTimexes = 0;
var timexes = [];
var currId, dct;
var shifted = false;
var openedInput = false;
var docNr = -1;
var trackNr = 0;

var colorDate = [ "55,126,184","77,175,74","152,78,163","255,127,0","228,26,28","166,86,40" ];

// Shift allows selecting several elements --> no user select, when Shift pressed
$(document).on('keyup keydown', function(e){
  shifted = e.shiftKey;
  if(shifted){ $('#leftBox, #timeline').addClass("nouserselect") }
  else{ $('#leftBox, #timeline').removeClass("nouserselect") }
  });

$(document).ready( function(){ 
  $(".ctlBtns")
    .on("mouseover" , function(){ 
      var el = $(this).attr("id");
      if(el!="addDoc" && el!="prevDate" && el!="nextDate" && el!="tool_delete"){
        showTooltip($(this),"#tooltipbox")
      }
      
    })
    .on("mouseout" , function(){ $(".tt").css("display","none") })
})

function showTooltip(t,tt){
  $(tt)
      .css({ "display": "block" , "top" : t.position().top + 5 })
      .html(t.attr("title"))
  if(t.attr("id")=="addDoc"){ $(tt).css("left" , t.offset().left - 5) }
}

function showlabel(d){
  var ww = $("#topBox").width();
  var thisid = "#timelineItem_" + d.id;

  var labely = $("#topBox").height() - parseInt($(thisid).position().top)+2;
  var labelx = parseInt($(thisid).position().left);
  var toofarright = labelx>ww-200
  if(toofarright){ labelx = labelx-200 } // don't know yet width of label

  $("#eventlabel")
    .css({ left : labelx , bottom : labely , "display" : "block"})
    .html(d.sub)

  if(toofarright){ $("#eventlabel").css({ left : (labelx+200-$("#eventlabel").width()+itemHeight/2) })}
}

function getDCT(file){ return file.match(/<DATE_TIME>([^<]*)<\/DATE_TIME>/)[1] }

function dealTime(time){//输入时间字符串，返回时间戳数组
  var t=time.split(',');
  if(t.length==1){
    return [getTargetTime(time)];
  }else{
    return [getTargetTime(t[0]),getTargetTime(t[1])];
  }
}
function deepClone(obj){
    var result,oClass=isClass(obj);
        //确定result的类型
    if(oClass==="Object"){
        result={};
    }else if(oClass==="Array"){
        result=[];
    }else{
        return obj;
    }
    for(key in obj){
        var copy=obj[key];
        if(isClass(copy)=="Object"){
            result[key]=arguments.callee(copy);//递归调用
        }else if(isClass(copy)=="Array"){
            result[key]=arguments.callee(copy);
        }else{
            result[key]=obj[key];
        }
    }
    return result;
}
//返回传递给他的任意对象的类
function isClass(o){
    if(o===null) return "Null";
    if(o===undefined) return "Undefined";
    return Object.prototype.toString.call(o).slice(8,-1);
}
function getColor(d){
  var isDate = !isNaN(d.times[0].starting_time);
  var dN = d.trackNr
  var touched = d.touched;
  if(touched) var o = "1"
  else var o = "0.5"
  if(dN!=-1){
    
    return "rgba("+colorDate[dN]+"," + o + ")";
  }
  // Vague or undefined dates
  else{
    return "rgba(111,111,111," + o + ")";
    }
}
function getCirclePath(datum,beginning,scaleFactor){
  var cx = parseInt(getXPos(datum,beginning,scaleFactor));

  if(isNaN(cx) && datum.val != "1970"){ cx = 150
    console.log("datum: "+datum.val+" beg: "+beginning+", sF: "+scaleFactor)
    }
  var cy = parseInt(getYPos(datum));
  //console.log(datum.id + ": " +cy)
  
  if(datum.visible){ var r = itemHeight/2; }
  else{ var r = 0; }
  var path = "M "+cx+" "+cy+" m -"+r+", 0 a "+r+","+r+" 0 1,0 "+(r*2)+",0 a "+r+","+r+" 0 1,0 -"+(r*2)+",0"
  return path
}

function updateTime(t){
  var d=deepClone(t);
  d.forEach(function(x){
    var time=x.times.split(',');
    if(time.length==1){
      var thisTime=getTargetTime(time[0]);
      x.times=[{"starting_time":thisTime,"ending_time":thisTime}];
    }else{
      var leftTime=getTargetTime(time[0]),
        rightTime=getTargetTime(time[1]);
      x.times=[{"starting_time":leftTime,"ending_time":rightTime}];
    }
  })
  return d;
}
function isEmptyObject(obj){ //判断是否为空对象
    for(var n in obj){return false} 
    return true; 
} 
function getFinalDraw(f,l){ //得到最终画图的位置
  // console.log(judgeAR(f,l))
  // console.log(f);
  if(!judgeAR(f,l)){
    return l;
  }else{
    l.shang=l.shang-20;
    l.xia=l.xia-20;
    // console.log("tangxiang")
    return getFinalDraw(f,l);
  }

}
function judgeAR(f,l){//判断l对象是否与f中所有对象重合
    if(isEmptyObject(f)){
      // console.log("tangxiang")
      return false;
    }else{
      var re=false;
      f.forEach(function(t){
        if(judgeRR(t,l)){
          re=true;
        }
      })
      return re;
    }
}
function judgeRR(t,l){ //判断两个区域是否重合
  if(l.zuo>=t.you||l.you<=t.zuo||l.shang>=t.xia||l.xia<=t.shang){
    return false;
  }else{
    return true;
  }
}
function getMaxTime(t){
  var maxTime=-62135596800000;
  t.forEach(function(tx){
    if(!tx.deleted){
      var time=dealTime(tx.times);
      if(time.length==1){
        maxTime=Math.max(maxTime,time[0]);
      }else{
        maxTime=Math.max(maxTime,time[0],time[1]);
      }
    }
  }) 
  return maxTime; 
}

function getMinTime(t){  //返回
  var minTime=1420070400000;
  t.forEach(function(tx){
    if(!tx.deleted){
      var time=dealTime(tx.times);
      if(time.length==1){
        minTime=Math.min(minTime,time[0]);
      }else{
        minTime=Math.min(minTime,time[0],time[1]);
      }
    }
  })
  return minTime;
}

function getTargetTime(t){  //得到指定时间字符串的时间戳
    var d = t,
        date = new Date()

    date.setYear(d.split("-")[0])
    date.setMonth(d.split("-")[1] - 1)
    date.setDate(d.split("-")[2])

    return date.getTime()    
}
function setSentTx(id){ sentTx = id; }

// Check Date Input
function validate(event,el) {

  var key = window.event ? event.keyCode : event.which;
  if(event.key == "Enter" || key == 13){
    if(!el){ $("#check").trigger('click') }
    else{ el.blur() }
  }

  if(!el){
    if (key == 8 || key == 9 || key == 46 || key == 37 || key == 39 || key == 88) { return true; }
    else if ( key < 48 || key > 57 ) { return false; }
    else{ return true; }
  }
};


// Behaviour
function openInput(){
    $("#inputOverlay").fadeIn(300);
    $(".chooseTrack").removeClass("chosen")
    $("#chooseTrack_"+(trackNr)).addClass("chosen")
    var today = getToday()
    $("#todayInput").val(today)
    if(!openedInput){
      $(".chooseTrack").on( "click" , function(){
        $(".chooseTrack").removeClass("chosen")
        // CONTINUE HERE
        trackNr = $(this).attr("id").split("_")[1]
        $("#"+$(this).attr("id")).addClass("chosen")
      })
      openedInput = true;
    }
    $(document).on("keydown" , exitOverlay )
}

function showURL(){
    $("#url-form").toggle(0);
}

function exitOverlay(e){ if(e.keyCode == 27){ closeInput() } }

function closeInput(){
  $(document).off("keydown",exitOverlay)
  $("#inputOverlay").fadeOut(300);
  $('#inputOverlay input[name="title"]').val("")
  $('#inputOverlay input[name="date"]').val("")
  $('#inputOverlay textarea[name="content"]').val("")
  $('#inputOverlay input[name="source"]').val("")
}