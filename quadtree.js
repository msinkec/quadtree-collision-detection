class Circle {
    
    constructor(x, y, r, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.isColided = false;
        this.velocityX = velocityX;          // pixels per second
        this.velocityY = velocityY;
    }

    intersects(other) {
        var deltaX = this.x - other.x;
        var deltaY = this.y - other.y;
        if (Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2)) <= this.r + other.r) {
            return true;
        }
        return false;
    }

 }

class AABB {

    constructor(x, y, halfLength) {
        this.x = x;
        this.y = y;
        this.halfLength = halfLength;
    }

    containsCircle(circle) {
        if ((circle.x + circle.r >= this.x - this.halfLength) &&
            (circle.x - circle.r <= this.x + this.halfLength) &&
            (circle.y + circle.r >= this.y - this.halfLength) &&
            (circle.y - circle.r <= this.y + this.halfLength)) {
            return true;
        }
        return false;
    }

    intersectsAABB(otherAABB) {
        if (Math.abs(this.x - otherAABB.x) < this.halfLength + otherAABB.halfLength &&
            Math.abs(this.y - otherAABB.y) < this.halfLength + otherAABB.halfLength) {
            return true;
        }
        return false;
    }

}

class QuadTree {

    constructor(boundaryAABB) {
        this.boundaryAABB = boundaryAABB;
        this.circles = [];

        this.northWest = null;
        this.northEast = null;
        this.southWest = null;
        this.southEast = null;
    }

    insert(circle) {
        // Ignore circle if it doesn't belong in this quad.
        if (!this.boundaryAABB.containsCircle(circle)) {
            return false;
        }

        // If there are no subdivision and there is space, then add the circle.
        if (this.circles.length < QuadTree.CAPACITY && this.northWest == null) {
            this.circles.push(circle);
            return true;
        }

        // If there is no space, then subdivide the QuadTree, if it hasn't been already.
        if (this.northWest == null) {
            this.subdivide();
        }

        // Add point to all subdivisions (only one will accept it).
        if (this.northWest.insert(circle)) { return true; };
        if (this.northEast.insert(circle)) { return true; };
        if (this.southWest.insert(circle)) { return true; };
        if (this.southEast.insert(circle)) { return true; };

        console.log('[ERROR] This never should be called');
        return false;
    }

    subdivide() {
        var quarterLength = this.boundaryAABB.halfLength / 2;

        this.northWest = new QuadTree(
                            new AABB(
                                this.boundaryAABB.x - quarterLength,
                                this.boundaryAABB.y - quarterLength,
                                quarterLength
                            )
                         );
        this.northEast = new QuadTree(
                            new AABB(
                                this.boundaryAABB.x + quarterLength,
                                this.boundaryAABB.y - quarterLength,
                                quarterLength
                            )
                         );
        this.southWest = new QuadTree(
                            new AABB(
                                this.boundaryAABB.x - quarterLength,
                                this.boundaryAABB.y + quarterLength,
                                quarterLength
                            )
                         );
        this.southEast = new QuadTree(
                            new AABB(
                                this.boundaryAABB.x + quarterLength,
                                this.boundaryAABB.y + quarterLength,
                                quarterLength
                            )
                         );

    }

    // Find all circles that are in the given range
    queryRange(rangeAABB) {
        var foundCircles = [];

        // Return empty array if the range doesn't intersect with this quad.
        if (!this.boundaryAABB.intersectsAABB(rangeAABB)) {
            return foundCircles;
        }

        for (let c of this.circles) {
            if (rangeAABB.containsCircle(c)) {
                foundCircles.push(c);
            }
        }

        // If this quad has no subdivision there is nothing left to search.
        if (this.northWest == null) {
            return foundCircles;
        }

        // Otherwise, search the subdivisions and add the returned points to the result.
        Array.prototype.push.apply(foundCircles, this.northWest.queryRange(rangeAABB));
        Array.prototype.push.apply(foundCircles, this.northEast.queryRange(rangeAABB));
        Array.prototype.push.apply(foundCircles, this.southWest.queryRange(rangeAABB));
        Array.prototype.push.apply(foundCircles, this.southEast.queryRange(rangeAABB));

        return foundCircles;
    }

    draw(context, drawGrid) {
        if (drawGrid) {
            this.drawBoxes(context);
        }
        this.drawCircles(context);
    }

    drawBoxes(context) {
        // Draw boundaries.
        if (this.northWest != null) {
            this.northWest.drawBoxes(context);
            this.northEast.drawBoxes(context);
            this.southWest.drawBoxes(context);
            this.southEast.drawBoxes(context);
        } else {
            context.beginPath();
            context.rect(this.boundaryAABB.x - this.boundaryAABB.halfLength,
                         this.boundaryAABB.y - this.boundaryAABB.halfLength,
                         2 * this.boundaryAABB.halfLength, 2 * this.boundaryAABB.halfLength);
            context.lineWidth = 3;
            context.strokeStyle = 'black';
            context.closePath();
            context.stroke();
        }
    }

    drawCircles(context) {
        if (this.northWest != null) {
            this.northWest.drawCircles(context);
            this.northEast.drawCircles(context);
            this.southWest.drawCircles(context);
            this.southEast.drawCircles(context);
        }
 
        // Draw circles.
        for (let c of this.circles) {
            context.beginPath();
            context.arc(c.x, c.y, c.r, 0, 2 * Math.PI, false);
            if (c.isColided) {
                context.fillStyle = 'red';
            } else {
                context.fillStyle = 'lightgreen';
            }
            context.fill();
            context.lineWidth = 0.1;
            if (c.isColided) {
                context.strokeStyle = 'red';
            } else {
                context.strokeStyle = 'lightgreen';
            }
            context.closePath();
            context.stroke();
        }
    }

}


function run() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    let detections = 0;

    // Push new circles if user is holding mouse button
    if (mouseIsDown) {
        let velocityX = Math.random() * (100 + 50) + -50;
        let velocityY = Math.random() * (100 + 50) + -50;
        let x = mouseX;
        let y = mouseY;
        let r = 10.0;
        if (x + r > canvas.width) {
            let delta = (x + r) - canvas.width;
            x -= delta;
        } else if (x - r < 0) {
            let delta = Math.abs(x - r);
            x += delta;
        }
        if (y + r > canvas.height) {
            let delta = (y + r) - canvas.height;
            y -= delta;
        } else if (y - r < 0) {
            let delta = Math.abs(y - r);
            y += delta;
        }
        circles.push(new Circle(x, y, r, velocityX, velocityY));
    }

    // Construct QuadTree
    let quadTree = new QuadTree(boundaryAABB);

    for (let c of circles) {
        c.isColided = false;
        quadTree.insert(c);
    }

    // Detect Collisions.
    for (let c of circles) {
        let searchedAABB =  new AABB(c.x, c.y, c.r + 1);
        let foundCircles = quadTree.queryRange(searchedAABB);
        for (let fc of foundCircles) {
            // Ignore the point that is being checked
            if (c == fc) {
                continue;
            }

            detections++;

            if (c.intersects(fc)) {
                c.isColided = true;
                fc.isColided = true;
                break;  // We only need to check if the particle has colided at all, so we can break.
            } 
        } 
    }

    // Draw QuadTree bounds and circles.
    quadTree.draw(context, drawGridCheckbox.checked);

    // Apply movements.
    d = new Date();
    deltaTimeS = (d.getTime() / 1000.0) - lastTimeS;
    lastTimeS = d.getTime() / 1000.0;
 
    for (let c of circles) {
        let nextX = c.x + c.velocityX * deltaTimeS;
        let nextY = c.y - c.velocityY * deltaTimeS;

        // If circle hit edge of canvas, change its moving direction.
        if (nextX - c.r <= 0 || nextX + c.r >= canvas.width) {
            c.velocityX *= -1;
            c.x += c.velocityX * deltaTimeS;
        } else {
            c.x = nextX;
        }
        if (nextY - c.r <= 0 || nextY + c.r >= canvas.height) {
            c.velocityY *= -1;
            c.y -= c.velocityY * deltaTimeS;
        } else {
            c.y = nextY;
        }
    }

    // Calculate FPS (this is kind of hacky, should be smoothed average).
    frameCount++;
    frameTimer += deltaTimeS;
    if (frameTimer > 1.0) {
        fpsDisplay.textContent = frameCount;
        frameCount = 0;
        frameTimer = 0;
    }

    // Update other statistics.
    particleCounter.textContent = circles.length;
    detectionCounter.textContent = detections;
    bruteforceCounter.textContent = Math.pow(circles.length, 2);
}


QuadTree.CAPACITY = 3;

var drawGridCheckbox = document.getElementById('checkbox_draw_grid');
drawGridCheckbox.checked = true;

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var canvasDimension = canvas.height;

var circles = [];

var halfLength = canvasDimension / 2;
var boundaryAABB = new AABB(halfLength, halfLength, halfLength);

var d = new Date();
var lastTimeS = d.getTime() / 1000.0;
var deltaTimeS = 0;
    
var mouseIsDown = false;
var mouseX = 0;
var mouseY = 0;

var fpsDisplay = document.getElementById('FPS');
var frameCount = 0;
var frameTimer = 0;

var particleCounter = document.getElementById('particle_counter');
var detectionCounter = document.getElementById('detection_counter');
var bruteforceCounter = document.getElementById('bruteforce_counter');

canvas.onmousedown = function(e){
    mouseIsDown = true;

}
canvas.onmouseup = function(e){
    mouseIsDown = false;
}

canvas.addEventListener('mousemove', function(evt) {
    var rect = canvas.getBoundingClientRect();
    mouseX = evt.clientX - rect.left;
    mouseY = evt.clientY - rect.top;
    }, false
);

setInterval(run, 15);

