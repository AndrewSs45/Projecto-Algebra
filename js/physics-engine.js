/**
 * Chess Physics Engine - Lógica de Ajedrez Real
 * Implementa las reglas de movimiento de cada pieza
 */

class ChessPosition {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }

  static fromNotation(notation) {
    const col = notation.charCodeAt(0) - 97; // a=0, b=1, ..., h=7
    const row = 8 - parseInt(notation[1]); // 8=0, 7=1, ..., 1=7
    return new ChessPosition(col, row);
  }

  toNotation() {
    const col = String.fromCharCode(this.x + 97);
    const row = 8 - this.y;
    return `${col}${row}`;
  }
}

class ChessPiece {
  constructor(type, color, position) {
    this.type = type; // "peon", "caballo", "alfil", "torre", "reina", "rey"
    this.color = color; // "blanca" o "negra"
    this.position = position; // ChessPosition
    this.hasMoved = false; // Para peones y rey (enroque)
  }

  getValidMoves(board) {
    switch (this.type) {
      case 'peon':
        return this.getPawnMoves(board);
      case 'torre':
        return this.getRookMoves(board);
      case 'alfil':
        return this.getBishopMoves(board);
      case 'caballo':
        return this.getKnightMoves(board);
      case 'reina':
        return this.getQueenMoves(board);
      case 'rey':
        return this.getKingMoves(board);
      default:
        return [];
    }
  }

  // PEÓN: Condicional
  getPawnMoves(board) {
    const moves = [];
    const direction = this.color === 'blanca' ? -1 : 1; // Blancas suben (y-), Negras bajan (y+)
    const startRow = this.color === 'blanca' ? 6 : 1;

    // Avance hacia adelante
    const oneForward = new ChessPosition(this.position.x, this.position.y + direction);
    if (board.isWithinBounds(oneForward) && !board.getPieceAt(oneForward)) {
      moves.push(oneForward);

      // Doble avance en primer movimiento
      if (this.position.y === startRow) {
        const twoForward = new ChessPosition(this.position.x, this.position.y + 2 * direction);
        if (!board.getPieceAt(twoForward)) {
          moves.push(twoForward);
        }
      }
    }

    // Captura diagonal
    const captures = [
      new ChessPosition(this.position.x - 1, this.position.y + direction),
      new ChessPosition(this.position.x + 1, this.position.y + direction)
    ];

    for (const capturePos of captures) {
      if (board.isWithinBounds(capturePos)) {
        const target = board.getPieceAt(capturePos);
        if (target && target.color !== this.color) {
          moves.push(capturePos);
        }
      }
    }

    return moves;
  }

  // TORRE: Bucle en línea recta (4 direcciones)
  getRookMoves(board) {
    const directions = [
      { x: 0, y: -1 }, // Arriba
      { x: 0, y: 1 },  // Abajo
      { x: -1, y: 0 }, // Izquierda
      { x: 1, y: 0 }   // Derecha
    ];

    return this.getLineMoves(board, directions);
  }

  // ALFIL: Bucle en diagonal (4 direcciones)
  getBishopMoves(board) {
    const directions = [
      { x: 1, y: 1 },   // Diagonal abajo-derecha
      { x: 1, y: -1 },  // Diagonal arriba-derecha
      { x: -1, y: 1 },  // Diagonal abajo-izquierda
      { x: -1, y: -1 }  // Diagonal arriba-izquierda
    ];

    return this.getLineMoves(board, directions);
  }

  // REINA: Bucle en 8 direcciones (Torre + Alfil)
  getQueenMoves(board) {
    const directions = [
      // Líneas rectas
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      // Diagonales
      { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];

    return this.getLineMoves(board, directions);
  }

  // Método auxiliar para piezas que se mueven en línea (Torre, Alfil, Reina)
  getLineMoves(board, directions) {
    const moves = [];

    for (const dir of directions) {
      let x = this.position.x + dir.x;
      let y = this.position.y + dir.y;

      while (board.isWithinBounds(new ChessPosition(x, y))) {
        const pos = new ChessPosition(x, y);
        const target = board.getPieceAt(pos);

        if (!target) {
          // Casilla vacía
          moves.push(pos);
        } else if (target.color !== this.color) {
          // Captura enemigo
          moves.push(pos);
          break;
        } else {
          // Bloqueo por pieza propia
          break;
        }

        x += dir.x;
        y += dir.y;
      }
    }

    return moves;
  }

  // CABALLO: Saltos de L (8 offsets fijos)
  getKnightMoves(board) {
    const offsets = [
      { x: 1, y: 2 },   { x: 1, y: -2 },
      { x: -1, y: 2 },  { x: -1, y: -2 },
      { x: 2, y: 1 },   { x: 2, y: -1 },
      { x: -2, y: 1 },  { x: -2, y: -1 }
    ];

    const moves = [];

    for (const offset of offsets) {
      const newPos = new ChessPosition(
        this.position.x + offset.x,
        this.position.y + offset.y
      );

      if (board.isWithinBounds(newPos)) {
        const target = board.getPieceAt(newPos);
        if (!target || target.color !== this.color) {
          moves.push(newPos);
        }
      }
    }

    return moves;
  }

  // REY: 8 casillas adyacentes (sin bucle)
  getKingMoves(board) {
    const offsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                     { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },   { x: 1, y: 1 }
    ];

    const moves = [];

    for (const offset of offsets) {
      const newPos = new ChessPosition(
        this.position.x + offset.x,
        this.position.y + offset.y
      );

      if (board.isWithinBounds(newPos)) {
        const target = board.getPieceAt(newPos);
        if (!target || target.color !== this.color) {
          moves.push(newPos);
        }
      }
    }

    return moves;
  }
}

class ChessBoard {
  constructor(width = 8, height = 8, cellSize = 60) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.pieces = [];
    this.selectedPiece = null;
    this.validMoves = [];

    this.initializeBoard();
  }

  isWithinBounds(pos) {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  getPieceAt(pos) {
    return this.pieces.find(p => p.position.equals(pos));
  }

  initializeBoard() {
    this.pieces = [];

    // Piezas negras (arriba, y=0)
    // Orden: Torre, Caballo, Alfil, Reina, Rey, Alfil, Caballo, Torre
    this.addPiece('torre', 'negra', 0, 0);
    this.addPiece('caballo', 'negra', 1, 0);
    this.addPiece('alfil', 'negra', 2, 0);
    this.addPiece('reina', 'negra', 3, 0);  // Reina en d8
    this.addPiece('rey', 'negra', 4, 0);    // Rey en e8
    this.addPiece('alfil', 'negra', 5, 0);
    this.addPiece('caballo', 'negra', 6, 0);
    this.addPiece('torre', 'negra', 7, 0);

    // Peones negros (y=1, fila 7)
    for (let i = 0; i < 8; i++) {
      this.addPiece('peon', 'negra', i, 1);
    }

    // Peones blancos (y=6, fila 2)
    for (let i = 0; i < 8; i++) {
      this.addPiece('peon', 'blanca', i, 6);
    }

    // Piezas blancas (abajo, y=7, fila 1)
    // Orden: Torre, Caballo, Alfil, Reina, Rey, Alfil, Caballo, Torre
    this.addPiece('torre', 'blanca', 0, 7);
    this.addPiece('caballo', 'blanca', 1, 7);
    this.addPiece('alfil', 'blanca', 2, 7);
    this.addPiece('reina', 'blanca', 3, 7);  // Reina en d1
    this.addPiece('rey', 'blanca', 4, 7);    // Rey en e1
    this.addPiece('alfil', 'blanca', 5, 7);
    this.addPiece('caballo', 'blanca', 6, 7);
    this.addPiece('torre', 'blanca', 7, 7);
  }

  addPiece(type, color, x, y) {
    const piece = new ChessPiece(type, color, new ChessPosition(x, y));
    this.pieces.push(piece);
  }

  selectPiece(piece) {
    this.selectedPiece = piece;
    this.validMoves = piece ? piece.getValidMoves(this) : [];
  }

  movePiece(piece, toPos) {
    // Obtener movimientos válidos de la pieza
    const validMoves = piece.getValidMoves(this);
    
    // Verificar si el movimiento es válido
    if (!validMoves.some(m => m.equals(toPos))) {
      return false;
    }

    // Información del movimiento
    const moveInfo = {
      piece: piece,
      fromPos: new ChessPosition(piece.position.x, piece.position.y),
      toPos: toPos,
      capturedPiece: null,
      isEnPassant: false
    };

    // Capturar pieza enemiga si existe
    const capturedPiece = this.getPieceAt(toPos);
    if (capturedPiece) {
      this.pieces = this.pieces.filter(p => p !== capturedPiece);
      moveInfo.capturedPiece = capturedPiece;
    } else if (piece.type === 'peon') {
      // Lógica de en passant (captura al paso)
      const deltaX = toPos.x - piece.position.x;
      const deltaY = toPos.y - piece.position.y;
      
      // Si el peón se mueve diagonalmente a una casilla vacía
      if (Math.abs(deltaX) === 1 && Math.abs(deltaY) === 1) {
        const capturePos = new ChessPosition(piece.position.x + deltaX, piece.position.y);
        const enPassantPiece = this.getPieceAt(capturePos);
        if (enPassantPiece && enPassantPiece.type === 'peon' && enPassantPiece.color !== piece.color) {
          this.pieces = this.pieces.filter(p => p !== enPassantPiece);
          moveInfo.capturedPiece = enPassantPiece;
          moveInfo.isEnPassant = true;
        }
      }
    }

    // Mover pieza
    piece.position = toPos;
    piece.hasMoved = true;

    // Limpiar selección
    this.selectedPiece = null;
    this.validMoves = [];

    return moveInfo;
  }

  getAllPieces() {
    return this.pieces;
  }

  getPieceInfo(piece) {
    const typeNames = {
      'peon': 'Peón',
      'caballo': 'Caballo',
      'alfil': 'Alfil',
      'torre': 'Torre',
      'reina': 'Reina',
      'rey': 'Rey'
    };

    const colorName = piece.color === 'blanca' ? 'Blanco' : 'Negro';
    return `${typeNames[piece.type]} ${colorName}`;
  }
}

// Exportar para uso en navegador
if (typeof window !== 'undefined') {
  window.ChessPosition = ChessPosition;
  window.ChessPiece = ChessPiece;
  window.ChessBoard = ChessBoard;
}
