window.onload = function() {
	tracking.ColorTracker.registerColor('green', function(r, g, b) {
	  if (g > r && g > b) {
	    return true;
	  }
	  return false;
	});

	window.stateMachine = {
		draw : false,
		calibrate : false,
		recordCalibrationRectangle : function(centroid) {
			// Check if new top left
			if ((centroid.x < drawingArea.tl.x) && (centroid.y < drawingArea.tl.y)) {
				drawingArea.tl = centroid;
			}

			// Check if new top right
			if ((centroid.x > drawingArea.tr.x) && (centroid.y < drawingArea.tr.y)) {
				drawingArea.tr = centroid;
			}

			// Check if new bottom left
			if ((centroid.x < drawingArea.bl.x) && (centroid.y > drawingArea.bl.y)) {
				drawingArea.bl = centroid;
			}

			// Check if new bottom right
			if ((centroid.x > drawingArea.br.x) && (centroid.y > drawingArea.br.y)) {
				drawingArea.br = centroid;
			}
		}
	}

	var video = document.getElementById('video');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');

	var drawing = document.getElementById('drawing');
			drawing.height = window.innerHeight;
			drawing.width  = window.innerHeight * 1.33333333;
			drawing.style.left = ((window.innerWidth - drawing.width)/2) + "px";
	var drawingContext = drawing.getContext('2d');

	var preserveAspectRatioWhenScaling = true;

	var drawingArea = {
		br : { x : 0, y : 0},
		bl : { x : canvas.width, y : 0 },
		tr : { x : 0, y : canvas.height },
		tl : { x : canvas.width, y : canvas.height }
	}

	var scaledDrawingArea = {};

	// Scaling Functions, maps position from camera video onto drawing board.

	var xScale = function(x) {
  	return x * (drawing.width / canvas.width);

  }

  var yScale = function(y) {
  	return y * (drawing.height / canvas.height);
  }


	// Drawing function

	var drawCircle = function(cx, cy, r) {
		drawingContext.beginPath();
	  drawingContext.fillStyle = "#000";
	  drawingContext.arc(cx, cy, r, 0, (2 * Math.PI), false);
	  drawingContext.fill();
	  drawingContext.moveTo(cx, cy);
	}

	var tracker = new tracking.ColorTracker('green');
	var lkp;
	var refs = [];
	var maxRefs = 100;

	var drawCalibratedAreaRect = function() {

		scaledDrawingArea.br = {
			x : xScale(drawingArea.br.x),
			y : yScale(drawingArea.br.y)
		}

		scaledDrawingArea.bl = {
			x : xScale(drawingArea.bl.x),
			y : yScale(drawingArea.bl.y)
		}

		scaledDrawingArea.tr = {
			x : xScale(drawingArea.tr.x),
			y : yScale(drawingArea.tr.y)
		}
		scaledDrawingArea.tl = {
			x : xScale(drawingArea.tl.x),
			y : yScale(drawingArea.tl.y)
		}

		drawingContext.strokeStyle = "#32FA78";
		drawingContext.lineWidth = 2;
		drawingContext.beginPath();
		drawingContext.moveTo(scaledDrawingArea.tl.x, scaledDrawingArea.tl.y);
		drawingContext.lineTo(scaledDrawingArea.tr.x, scaledDrawingArea.tr.y);
		drawingContext.lineTo(scaledDrawingArea.br.x, scaledDrawingArea.br.y);
		drawingContext.lineTo(scaledDrawingArea.bl.x, scaledDrawingArea.bl.y);
		drawingContext.lineTo(scaledDrawingArea.tl.x, scaledDrawingArea.tl.y);
		drawingContext.stroke();
	}

	var pen = {

		continuous : function(event) {
			context.clearRect(0, 0, canvas.width, canvas.height);

		  var centroid;

		  event.data.forEach(function(rect) {
		  	// Rectangle tracking guides
		    context.strokeStyle = '#a64ceb';
		    context.strokeRect(rect.x, rect.y, rect.width, rect.height);

		    // Calculate stuff
		    centroid = {
		    	x : canvas.width - ((.5 * rect.width) + rect.x),
		    	y : (.5 * rect.height) + rect.y
		    }

		  });

		  if (lkp && centroid) {

		  	var vector = {
		  		x : lkp.x - centroid.x,
		  		y : lkp.y - centroid.y
		  	}

		  	var velocity = Math.abs(Math.sqrt( (vector.x * vector.x) + (vector.y * vector.y ) ) ) / 3;

		  	if (velocity > 7) {
		  		velocity = 7;
		  	}

		  	if (velocity == 0) {
		  		velocity = 8;
		  	}

			  if (window.stateMachine.draw && centroid) {
					
			  	var dp = {
			  		x : xScale(centroid.x),
			  		y : yScale(centroid.y)
			  	}

					drawingContext.lineTo(dp.x, dp.y);
					drawingContext.lineWidth = 2;
					drawingContext.stroke();  
				  drawCircle(dp.x, dp.y, (8-velocity));
				} else if (window.stateMachine.calibrate && centroid) {

					stateMachine.recordCalibrationRectangle(centroid);

				}
			}

			lkp = centroid;
		},

		tail : function(event) {
			drawingContext.clearRect(0, 0, drawing.width, drawing.height);
			context.clearRect(0, 0, canvas.width, canvas.height);

			event.data.forEach(function(rect) {
		  	// Rectangle tracking guides
		    context.strokeStyle = '#a64ceb';
		    context.strokeRect(rect.x, rect.y, rect.width, rect.height);

		    // Calculate stuff
		    centroid = {
		    	x : canvas.width - ((.5 * rect.width) + rect.x),
		    	y : (.5 * rect.height) + rect.y
		    }

		    refs.push(centroid);
		    if (refs.length > maxRefs) {
		    	refs.shift();
		    }

		    for (var i = 0; i < refs.length; i++) {
		    	var ref = {
		    		x : xScale(refs[i].x),
		    		y : yScale(refs[i].y)
		    	}
		    	var lkp;
		    	var velocity;

		    	if (i == 0) {
		    		drawingContext.moveTo(ref.x, ref.y);
		    		velocity = 0;
		    	} else {
		    		lkp = refs[i - 1];
		    		var vector = {
		    			x : refs[i].x - lkp.x,
		    			y : refs[i].y - lkp.y
	 	    		}
		    		velocity = Math.abs(Math.sqrt( (vector.x * vector.x) + (vector.y * vector.y ) ) ) / 3;

		    		if (velocity > 7) {
				  		velocity = 7;
				  	}

				  	if (velocity == 0) {
				  		velocity = 8;
				  	}

		    		drawingContext.lineTo(ref.x, ref.y);
		    		drawingContext.lineWidth = 2;
		    		drawingContext.strokeStyle = "#000";
		    		drawingContext.stroke();
		    	}

		    	drawCircle(ref.x, ref.y, 8 - velocity);

		    }

		  });
		},

		tiny : function(event) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			event.data.forEach(function(rect) {
		  	// Rectangle tracking guides
		    context.strokeStyle = '#a64ceb';
		    context.strokeRect(rect.x, rect.y, rect.width, rect.height);

		    centroid = {
		    	x : canvas.width - ((.5 * rect.width) + rect.x),
		    	y : (.5 * rect.height) + rect.y
		    }

		    var ref = {
		    	x : xScale(centroid.x),
		    	y : yScale(centroid.y)
		    }

		    if (stateMachine.draw && centroid) {
			    drawCircle(ref.x, ref.y, 1);
			  } else {
			  	stateMachine.recordCalibrationRectangle(centroid);
			  }

		  });
		}

	}

  tracking.track('#video', tracker, { camera : true });

  tracker.on('track', function(event) {

  	pen.tiny(event);
	  
	});

	document.addEventListener('keyup', function(e) {

		console.log(e.keyCode);

		if (e.keyCode == 32) {
			var d = window.stateMachine.draw;
			trackCounter = 0;
			window.stateMachine.draw = !d;
			window.stateMachine.calibrate = d;
		}

		if (e.keyCode == 100 || e.keyCode == 68) {
			console.log('yes');
			drawingContext.clearRect(0, 0, drawing.width, drawing.height);
		}

		if (e.keyCode == 116) {
			var cache = video.style.opacity;
			if (cache == 0) {
				video.style.opacity = .7;
			} else {
				video.style.opacity = 0;
			} 
		}
	});
}