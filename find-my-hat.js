'use strict';
const prompt = require('prompt-sync')({ sigint: true });
const Heap = require('collections/heap');

class Field {
    constructor(height, width, percentHoles, hard = false) {
        //set hard limit of 20 row by 50 column grid 
        this._height = height % 21;
        this._width = width % 51;
        this._percentHoles = percentHoles;
        //create placeholder for goal grid reference
        this._goal = [];
        //create placeholder for graph indices
        this._graph = [];
        //set initial state of grid as unsolvable
        this._solvable = false;
        //construct a random grid based on construct parameters
        this._field = this.generateField();
        //set random start location
        this._location = this.randomStart();
        //placeholder graph of available moves for each coordinate for solver
        this._availableMoves = {};
        this._gameOver = false;
        this._hardMode = hard;
    }
    //implement getters
    get field() {
        return this._field;
    }
    get location() {
        return this._location;
    }
    get gameOver() {
        return this._gameOver;
    }
    get height() {
        return this._height;
    }
    get width() {
        return this._width;
    }
    get percentHoles() {
        return this._percentHoles;
    }
    get hardMode() {
        return this._hardMode;
    }
    get goal() {
        return this._goal;
    }
    get graph() {
        return this._graph;
    }
    get availableMoves() {
        return this._availableMoves;
    }
    get solvable() {
        return this._solvable;
    }
    //display the current grid
    print() {
        this._field.forEach(element => console.log(element.join('')));
    }
    //set the game condition to terminate
    endGame() {
        this._gameOver = true;
    }
    //mark each spot visited to create a path
    makeVisited() {
        this._field[this._location[0]][this._location[1]] = '*';
    }
    //return the content at existing location; if outside bounds of grid returns undefined.
    posStatus() {
        if (this.location[0] < 0 || this.location[1] < 0) {
            return undefined;
        } else if (this.location[0] >= this._field.length) {
            return undefined;
        } else if (this.location[1] >= this._field[this.location[0]].length) {
            return undefined;
        } else {
            return this._field[this.location[0]][this.location[1]];
        }
    }
    //prompt the user for a move
    getMove() {
        console.log('You are currently at X');
        console.log('Which way? W = UP, S = DOWN, A = LEFT, D = RIGHT');
        const choice = prompt();
        return choice;
    }
    //mark the current location as visited, then update current location according to user input
    move() {
        switch (this.getMove()) {
            case 'W':
                this.makeVisited();
                this._location[0] -= 1;
                break;
            case 'S':
                this.makeVisited();
                this._location[0] += 1;
                break;
            case 'A':
                this.makeVisited();
                this._location[1] -= 1;
                break;
            case 'D':
                this.makeVisited();
                this._location[1] += 1;
                break;
            default:
                console.log('Invalid choice, valid options are W,A,S,D.')
        }
    }
    //determine the consequences of a move; if valid and not a WIN mark current grid location with X
    moveOutcome() {
        if (this.posStatus() === undefined) {
            console.log('You stepped out of the field! GAME OVER');
            this.endGame();
        } else if (this.posStatus() === '*' || this.posStatus() === '#') {
            this._field[this._location[0]][this._location[1]] = 'X';
        } else if (this.posStatus() === '^') {
            console.log('You found your hat! You win! GAME OVER');
            this.endGame();
        } else if (this.posStatus() === 'O') {
            console.log('You fell down a hole! GAME OVER');
            this.endGame();
        } else if (this.posStatus() === 'X') {
            return;
        } else {
            console.log('Internal Error. Move not recognised.')
        }
    }
    //call relevant game methods in correct order to play the game
    playGame() {
        let turnCount = 0;
        //check if starting grid is solvable; if not, reset
        this.astarSolver();
        while (!this.solvable) {
            this._field = this.generateField();
            this._location = this.randomStart();
            this.astarSolver();
        }
        while (!this.gameOver) {
            this.print();
            if (!this.solvable) {
                console.log('The grid can no longer be solved! GAME OVER');
                this.endGame();
                continue;
            }
            this.move();
            this.moveOutcome();
            turnCount++;
            if (this.hardMode && turnCount % 3 === 0) {
                this.digHole();
                this.astarSolver();
            }
        }
    }
    //sanitise input and generate a random grid or default grid of 10 by 10 if bad input detected
    generateField() {
        if (this.height <= 0) {
            this._height = 10;
            console.log('Invalid height detected, using default 10 rows');
        };
        if (this.width <= 0) {
            this._width = 10;
            console.log('Invalid width detected, using default 10 rows');
        };
        const desiredTotal = this.height * this.width;
        const holeNumber = Math.floor(this.percentHoles * desiredTotal / 100);
        const fieldComponents = ['^'];
        let randomField = [];
        for (let j = 0; j < this.height; j++) {
            randomField.push([]);
        };
        for (let i = 0; i < holeNumber; i++) {
            fieldComponents.push('O');
        };
        while (fieldComponents.length < desiredTotal) {
            fieldComponents.push('#');
        };
        for (let k = 0; k < this.height; k++) {
            for (let m = 0; m < this.width; m++) {
                randomField[k][m] = fieldComponents.splice(Math.floor(Math.random() * fieldComponents.length), 1)[0];
                //update this._goal with the instance grid ref of target ^ hat for solver
                if (randomField[k][m] === '^') {
                    this._goal = [k, m];
                }
                //create graph of locations for solver
                this._graph.push([k, m]);
            }
        }
        return randomField;
    }
    //set up a random start location and mark with X
    randomStart() {
        let startLocation = this.randomLocation();
        //check to ensure start point is not the goal
        while (this._field[startLocation[0]][startLocation[1]] === '^') {
            startLocation = this.randomLocation();
        }
        this._field[startLocation[0]][startLocation[1]] = 'X';
        return startLocation;
    }
    //generate a random hole for hard mode in locations that are not occupied, the ^ or already a hole.
    digHole() {
        let newHoleLoc = this.randomLocation();
        while (this.field[newHoleLoc[0]][newHoleLoc[1]] === '^' || this.field[newHoleLoc[0]][newHoleLoc[1]] === 'O' || this.field[newHoleLoc[0]][newHoleLoc[1]] === 'X') {
            newHoleLoc = this.randomLocation();
        }
        //printed a grid reference to more easily check digHole was working on a big grid while debugging!
        console.log(`A new hole appears at ${newHoleLoc}!`);
        this._field[newHoleLoc[0]][newHoleLoc[1]] = 'O';
    }
    //helper method to generate random location on the grid
    randomLocation() {
        const x = Math.floor(Math.random() * this.height);
        const y = Math.floor(Math.random() * this.width);
        const randLocation = [x, y];
        return randLocation;
    }
    //helper method to provide a Manhattan graph heuristic value for solver method  
    manhattanHeuristic(location) {
        const y_distance = Math.abs(location[0] - this.goal[0]);
        const x_distance = Math.abs(location[1] - this.goal[1]);
        return x_distance + y_distance;
    }
    //helper method to check if cell exists in graph for calculating available moves
    checkCell(cell) {
        for (let i = 0; i < this.graph.length; i++) {
            if (this.graph[i][0] === cell[0] && this.graph[i][1] === cell[1]) {
                return true;
            }
        }
        return false;
    }
    //helper method to provide Manhattan graph of available moves for any given location
    notHole() {
        let possibleMoves = {};
        for (const coordinate in this.graph) {
            const thisRow = this.graph[coordinate][0];
            const thisColumn = this.graph[coordinate][1];
            if (this.field[thisRow][thisColumn] === 'O') {
                continue;
            } else {
                possibleMoves[coordinate] = [];
                const upCell = [thisRow - 1, thisColumn];
                const downCell = [thisRow + 1, thisColumn];
                const leftCell = [thisRow, thisColumn - 1];
                const rightCell = [thisRow, thisColumn + 1];
                if (this.checkCell(upCell)) {
                    const upCellContent = this.field[upCell[0]][upCell[1]];
                    if (upCellContent != 'O') {
                        possibleMoves[coordinate].push([upCell, 1]);
                    }
                }
                if (this.checkCell(downCell)) {
                    const downCellContent = this.field[downCell[0]][downCell[1]];
                    if (downCellContent != 'O') {
                        possibleMoves[coordinate].push([downCell, 1]);
                    }
                }
                if (this.checkCell(leftCell)) {
                    const leftCellContent = this.field[leftCell[0]][leftCell[1]];
                    if (leftCellContent != 'O') {
                        possibleMoves[coordinate].push([leftCell, 1]);
                    }
                }
                if (this.checkCell(rightCell)) {
                    const rightCellContent = this.field[rightCell[0]][rightCell[1]];
                    if (rightCellContent != 'O') {
                        possibleMoves[coordinate].push([rightCell, 1]);
                    }
                }
            }
        }
        return possibleMoves;
    }
    //helper method to calculate a vertex ID from a given location
    vertexId(location) {
        return (location[0] * this.width) + (location[1])
    }
    astarSolver() {
        //let count = 0;
        //refresh available moves from current location every time astar solver is called
        this._availableMoves = this.notHole();
        let pathsAndDistances = {};
        const startId = this.vertexId(this.location);
        const targetId = this.vertexId(this.goal);
        for (const vertex in this.availableMoves) {
            pathsAndDistances[vertex] = [Infinity, [startId]];
        }
        pathsAndDistances[startId][0] = 0;
        let verticesToExplore = new Heap([[0, startId]]);
        while (verticesToExplore.length > 0 && pathsAndDistances[targetId][0] === Infinity) {
            const currentValues = verticesToExplore.pop();
            const currentDistance = currentValues[0];
            const currentVertex = currentValues[1];
            for (let i = 0; i < this.availableMoves[currentVertex].length; i++) {
                const neighbour = this.availableMoves[currentVertex][i][0];
                const neighbourId = this.vertexId(neighbour);
                const edgeWeight = this.availableMoves[currentVertex][i][1];
                const newDistance = currentDistance + edgeWeight + this.manhattanHeuristic(neighbour);
                const newPath = pathsAndDistances[currentVertex][1];
                //pathsAndDistances[currentVertex][1].push(this.vertexId(neighbour));
                newPath.push(this.vertexId(neighbour));
                if (newDistance < pathsAndDistances[neighbourId][0]) {
                    pathsAndDistances[neighbourId][0] = newDistance;
                    pathsAndDistances[neighbourId][1] = newPath;
                    verticesToExplore.push([newDistance, neighbourId]);
                    //count++;
                }
            }
        }
        if (pathsAndDistances[targetId][0] === Infinity) {
            this._solvable = false;
        } else {
            this._solvable = true;
        }
    }
}

//factory function to create a new instance of the game according to user preferences and start play
const findMyHat = () => {
    console.log('Enter desired grid height (max 20):');
    const rows = prompt();
    console.log('Enter desired grid width (max 50):');
    const columns = prompt();
    console.log('Enter percentage of starting holes (0-75):');
    const percent = prompt();
    console.log('Activate hard mode Y/N');
    const mode = prompt();
    let modeActive;
    if (mode === 'Y') {
        modeActive = true;
    } else {
        modeActive = false;
    }
    if (percent < 0) {
        percent = 0;
    } else if (percent > 75) {
        percent = 75;
    }
    const myField = new Field(rows, columns, percent, modeActive);
    myField.playGame();
}

//call the game function!
findMyHat();
