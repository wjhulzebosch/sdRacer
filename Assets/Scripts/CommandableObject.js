class CommandableObject {
    constructor(entity) {
        this.entity = entity;
    }

    moveForward() {
        console.log("MOVING, MOVING, MOVING");
        return this.entity.moveForward(window.world);
    }

    moveBackward() {
        return this.entity.moveBackward(window.world);
    }
    
    turnRight() {
        console.log("TURNING RIGHT");
        return this.entity.turnRight();
    }

    turnLeft() {
        return this.entity.turnLeft();
    }

    crash() {
        return this.entity.crash();
    }

    isCowAhead() {
        return this.entity.isCowAhead(window.world);
    }

    isRoadAhead() {
        return this.entity.isRoadAhead(window.world);
    }

    honk() {
        return this.entity.honk();
    }

    getDirectionToFinish() {
        let r = this.entity.getDirectionToFinish(); 
        console.log("getDirectionToFinish", r);
        return r;
    }

    getCurrentDirection() {
        let r = this.entity.getCurrentDirection();
        console.log("getCurrentDirection", r);
        return r;
    }

    isSafeToMove() {
        return this.entity.isSafeToMove(window.world);
    }
}

export default CommandableObject;