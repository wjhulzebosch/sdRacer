class CommandableObject {
    constructor(entity) {
        this.entity = entity;
    }

    output(string) {
        console.log(string);
    }

    moveForward() {
        return this.entity.moveForward(window.world);
    }

    moveBackward() {
        return this.entity.moveBackward(window.world);
    }
    
    turnRight() {
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
    
    isObstacleAhead() {
        return this.entity.isObstacleAhead(window.world);
    }
    
    isRoadClear() {
        return this.entity.isRoadClear(window.world);
    }

    isRoadAhead() {
        return this.entity.isRoadAhead(window.world);
    }

    honk() {
        return this.entity.honk();
    }

    getDirectionToFinish() {
        let r = this.entity.getDirectionToFinish(); 
        debug("getDirectionToFinish", r);
        return r;
    }

    getCurrentDirection() {
        let r = this.entity.getCurrentDirection();
        debug("getCurrentDirection", r);
        return r;
    }

    isSafeToMove() {
        return this.entity.isSafeToMove(window.world);
    }
}

export default CommandableObject;