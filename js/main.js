window.onload = function() {
	tracking.ColorTracker.registerColor('green', function(r, g, b) {
	  if (g > r && g > b && g > 150) {
	    return true;
	  }
	  return false;
	});

	window.stateMachine = {
		draw : false,
		calibrate : false
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
		ax : canvas.width,
		ay : canvas.height,
		bx : 0,
		by : 0
	}

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

					if (centroid.x < drawingArea.ax) {
						drawingArea.ax = centroid.x
					}

					if (centroid.x > drawingArea.bx) {
						drawingArea.bx = centroid.x
					}

					if (centroid.y < drawingArea.ay) {
						drawingArea.ay = centroid.y
					}

					if (centroid.y > drawingArea.by) {
						drawingArea.by = centroid.y
					}
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

		    if (stateMachine.draw) {
			    drawCircle(ref.x, ref.y, 1);
			  }

		  });
		}

	}

  tracking.track('#video', tracker, { camera : true });

  tracker.on('track', function(event) {

  	pen.tiny(event);
	  
	});

	document.onkeypress = function(e) {
		if (e.keyCode == 32) {
			var d = window.stateMachine.draw;
			window.stateMachine.draw = !d;
			window.stateMachine.calibrate = d;
		}

		if (e.keyCode == 99) {
			window.stateMachine.calibrate = true;
			window.stateMachine.draw = false;

			window.setTimeout(function() {
				window.stateMachine.calibrate = false;
				window.stateMachine.draw = false;
				alert("Calibration complete");
				console.log(drawingArea);
			}, 10000);
		}

		if (e.keyCode == 100) {
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
	}
}