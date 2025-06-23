class WinCondition {
    constructor(type, config = {}) {
        this.type = type; // 'single-car', 'multi-car', 'all-cars'
        this.config = config;
    }
    
    check(world) {
        switch (this.type) {
            case 'single-car':
                return this.checkSingleCarWin(world);
            case 'multi-car':
                return this.checkMultiCarWin(world);
            case 'all-cars':
                return this.checkAllCarsWin(world);
            default:
                return false;
        }
    }
    
    checkSingleCarWin(world) {
        const finishEntities = world.getEntitiesOfType('finish');
        return finishEntities.some(finish => finish.checkWinCondition(world));
    }
    
    checkMultiCarWin(world) {
        const finishEntities = world.getEntitiesOfType('finish');
        const carsAtFinish = [];
        
        finishEntities.forEach(finish => {
            const cars = finish.getCarsAtFinish(world);
            carsAtFinish.push(...cars);
        });
        
        return carsAtFinish.length > 0;
    }
    
    checkAllCarsWin(world) {
        const allCars = world.getEntitiesOfType('car');
        const finishEntities = world.getEntitiesOfType('finish');
        
        if (allCars.length === 0) return false;
        
        const carsAtFinish = [];
        finishEntities.forEach(finish => {
            const cars = finish.getCarsAtFinish(world);
            carsAtFinish.push(...cars);
        });
        
        // Check if all cars are at finish
        return carsAtFinish.length === allCars.length;
    }
    
    // Get detailed win information
    getWinDetails(world) {
        const finishEntities = world.getEntitiesOfType('finish');
        const allCars = world.getEntitiesOfType('car');
        const carsAtFinish = [];
        
        finishEntities.forEach(finish => {
            const cars = finish.getCarsAtFinish(world);
            carsAtFinish.push(...cars);
        });
        
        return {
            carsAtFinish: carsAtFinish.map(car => car.carType || 'default'),
            totalCars: allCars.length,
            mode: this.type,
            allCarsReached: carsAtFinish.length === allCars.length,
            won: this.check(world)
        };
    }
}

export default WinCondition; 