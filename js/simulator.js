/**
 * Chess Board Simulator Interactivo
 * Renderiza el tablero, piezas y visualiza vectores de movimiento
 */

class ChessBoardSimulator {
  constructor(containerId, width = 8, height = 8) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.board = new ChessBoard(width, height, 60);
    this.cellSize = 60;
    this.selectedPiece = null;
    this.highlightedMoves = [];
    this.animationFrame = null;
    this.isAnimating = false;
    
    // Tracking de movimientos para física
    this.lastMoveInfo = null;
    this.moveTimestamp = null;
    this.pieceSelectedTime = null; // Timestamp cuando se selecciona la pieza
    this.lastVelocity = 0;
    this.lastAcceleration = 0;
    this.lastAngle = 0;
    this.moveDistance = 0;
    this.lastForce = 0;
    this.validMovesCount = 0; // Cantidad de movimientos válidos (en lugar de masa)
    this.hasPhysicsData = false; // Flag para saber si hay datos de física calculados

    this.init();
  }

  init() {
    // Crear canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.board.width * this.cellSize;
    this.canvas.height = this.board.height * this.cellSize;
    this.canvas.style.border = '2px solid #0df2cc';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.cursor = 'pointer';
    this.canvas.style.boxShadow = '0 0 20px rgba(13, 242, 204, 0.3)';
    this.canvas.className = 'chess-board-canvas';

    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // Event listeners
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

    this.draw();
  }

  // Convertir pixel a coordenadas de celda
  pixelToCell(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;

    const cellX = Math.floor(relX / this.cellSize);
    const cellY = Math.floor(relY / this.cellSize);

    // Validar que está dentro del tablero
    if (cellX < 0 || cellX >= this.board.width || cellY < 0 || cellY >= this.board.height) {
      return null;
    }

    return new ChessPosition(cellX, cellY);
  }

  handleCanvasClick(event) {
    const clickedPos = this.pixelToCell(event.clientX, event.clientY);
    if (!clickedPos) return;

    const clickedPiece = this.board.getPieceAt(clickedPos);

    // Si no hay pieza seleccionada
    if (!this.selectedPiece) {
      // Si hay pieza en esta posición, seleccionarla
      if (clickedPiece) {
        this.selectedPiece = clickedPiece;
        this.highlightedMoves = this.selectedPiece.getValidMoves(this.board);
        this.validMovesCount = this.highlightedMoves.length; // Guardar cantidad de movimientos válidos
        this.pieceSelectedTime = Date.now(); // Registrar timestamp de selección
        console.log(`Pieza seleccionada: ${this.selectedPiece.type} en ${this.selectedPiece.position.toNotation()}, movimientos válidos:`, this.highlightedMoves.map(m => m.toNotation()));
      }
    } else {
      // Ya hay pieza seleccionada
      // Si click en la misma pieza, deseleccionar
      if (clickedPiece === this.selectedPiece) {
        this.selectedPiece = null;
        this.highlightedMoves = [];
        this.pieceSelectedTime = null;
      } else {
        // Intentar mover a la posición clickeada
        const moveResult = this.board.movePiece(this.selectedPiece, clickedPos);
        const moveSuccess = moveResult !== false;
        console.log(`Intento de movimiento a ${clickedPos.toNotation()}: ${moveSuccess ? 'exitoso' : 'fallido'}`);
        if (moveSuccess) {
          // Guardar información del movimiento para calcular física
          this.lastMoveInfo = moveResult;
          this.moveTimestamp = Date.now();
          this.calculateMovePhysics(moveResult);
          console.log(`Pieza movida a ${clickedPos.toNotation()}`);
          if (moveResult.capturedPiece) {
            const captureType = moveResult.isEnPassant ? 'en passant' : 'captura normal';
            console.log(`Pieza capturada (${captureType}): ${moveResult.capturedPiece.type} ${moveResult.capturedPiece.color}`);
          }
          this.selectedPiece = null;
          this.highlightedMoves = [];
          this.pieceSelectedTime = null;
          this.updatePhysicsDisplay();
        } else {
          // Si el movimiento falla, intentar seleccionar la nueva pieza
          if (clickedPiece) {
            this.selectedPiece = clickedPiece;
            this.highlightedMoves = this.selectedPiece.getValidMoves(this.board);
            this.validMovesCount = this.highlightedMoves.length; // Guardar cantidad de movimientos válidos
            this.pieceSelectedTime = Date.now(); // Actualizar timestamp de selección
            console.log(`Movimiento inválido. Nueva pieza seleccionada: ${this.selectedPiece.type}`);
          } else {
            this.selectedPiece = null;
            this.highlightedMoves = [];
            this.pieceSelectedTime = null;
          }
        }
      }
    }

    this.draw();
  }

  handleMouseMove(event) {
    this.draw();
  }

  draw() {
    // Limpiar canvas
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dibujar tablero
    this.drawBoard();

    // Dibujar movimientos válidos si hay pieza seleccionada
    if (this.selectedPiece) {
      this.drawValidMoves();
    }

    // Dibujar piezas
    this.drawPieces();
  }

  drawBoard() {
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const isLight = (x + y) % 2 === 0;
        this.ctx.fillStyle = isLight ? '#1e293b' : '#334155';
        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

        // Bordes de celda
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
      }
    }
  }

  drawValidMoves() {
    this.highlightedMoves.forEach(movePos => {
      const centerX = movePos.x * this.cellSize + this.cellSize / 2;
      const centerY = movePos.y * this.cellSize + this.cellSize / 2;

      // Círculo de movimiento válido
      this.ctx.fillStyle = 'rgba(13, 242, 204, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Borde del círculo
      this.ctx.strokeStyle = '#0df2cc';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    // Resaltar pieza seleccionada
    if (this.selectedPiece) {
      const centerX = this.selectedPiece.position.x * this.cellSize + this.cellSize / 2;
      const centerY = this.selectedPiece.position.y * this.cellSize + this.cellSize / 2;

      this.ctx.strokeStyle = '#0df2cc';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawPieces() {
    const pieceSymbols = {
      'peon': '♟',
      'caballo': '♞',
      'alfil': '♗',
      'torre': '♜',
      'reina': '♛',
      'rey': '♚'
    };

    const typeNames = {
      'peon': 'Peón',
      'caballo': 'Caballo',
      'alfil': 'Alfil',
      'torre': 'Torre',
      'reina': 'Reina',
      'rey': 'Rey'
    };

    this.board.pieces.forEach(piece => {
      const centerX = piece.position.x * this.cellSize + this.cellSize / 2;
      const centerY = piece.position.y * this.cellSize + this.cellSize / 2;

      // Círculo de pieza
      const isSelected = piece === this.selectedPiece;
      this.ctx.fillStyle = isSelected ? '#0df2cc' : '#22d3ee';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
      this.ctx.fill();

      // Color interior según si es blanca o negra
      this.ctx.fillStyle = piece.color === 'blanca' ? '#ffffff' : '#000000';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
      this.ctx.fill();

      // Símbolo de pieza
      const symbol = pieceSymbols[piece.type] || '●';
      this.ctx.fillStyle = piece.color === 'blanca' ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(symbol, centerX, centerY);

      // Etiqueta de nombre (solo si está seleccionada)
      if (isSelected) {
        this.ctx.fillStyle = '#0df2cc';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(typeNames[piece.type], centerX, centerY + 28);
      }

      // Indicador de movimiento reciente
      if (this.lastMoveInfo && this.lastMoveInfo.piece === piece) {
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
        this.ctx.stroke();

        // Mostrar línea de movimiento
        const fromX = this.lastMoveInfo.fromPos.x * this.cellSize + this.cellSize / 2;
        const fromY = this.lastMoveInfo.fromPos.y * this.cellSize + this.cellSize / 2;
        this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });

    // Mostrar piezas capturadas en la esquina
    this.drawCapturedPieces();
  }

  drawCapturedPieces() {
    const typeNames = {
      'peon': 'Peón',
      'caballo': 'Caballo',
      'alfil': 'Alfil',
      'torre': 'Torre',
      'reina': 'Reina',
      'rey': 'Rey'
    };

    if (this.lastMoveInfo && this.lastMoveInfo.capturedPiece) {
      const captured = this.lastMoveInfo.capturedPiece;
      const text = `Capturado: ${typeNames[captured.type]} ${captured.color === 'blanca' ? 'Blanco' : 'Negro'}`;
      
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      this.ctx.fillRect(5, this.canvas.height - 25, 200, 20);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(text, 10, this.canvas.height - 10);
    }
  }

  // Obtener información de la pieza seleccionada
  getSelectedPieceInfo() {
    if (!this.selectedPiece) return null;

    const typeNames = {
      'peon': 'Peón',
      'caballo': 'Caballo',
      'alfil': 'Alfil',
      'torre': 'Torre',
      'reina': 'Reina',
      'rey': 'Rey'
    };

    const colorName = this.selectedPiece.color === 'blanca' ? 'Blanco' : 'Negro';
    const position = this.selectedPiece.position.toNotation();
    const validMoves = this.validMovesCount; // Usar la cantidad almacenada

    return {
      name: `${typeNames[this.selectedPiece.type]} ${colorName}`,
      position: position,
      validMoves: validMoves,
      type: this.selectedPiece.type,
      color: this.selectedPiece.color
    };
  }

  // Obtener datos de física (para mostrar en el panel)
  getPhysicsData() {
    const piece = this.selectedPiece;
    if (!piece) return null;

    const position = piece.position;
    const moves = this.highlightedMoves.length;

    return {
      position: position.toNotation(),
      validMoves: moves,
      type: piece.type,
      color: piece.color
    };
  }

  // Calcular física del movimiento
  calculateMovePhysics(moveInfo) {
    // Calcular distancia (en celdas)
    const deltaX = moveInfo.toPos.x - moveInfo.fromPos.x;
    const deltaY = moveInfo.toPos.y - moveInfo.fromPos.y;
    this.moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Tiempo real transcurrido desde la selección (en segundos)
    let timeDelta = 0.5; // Default si no hay timestamp de selección
    if (this.pieceSelectedTime !== null) {
      timeDelta = (Date.now() - this.pieceSelectedTime) / 1000; // Convertir a segundos
      if (timeDelta < 0.1) timeDelta = 0.1; // Mínimo 0.1 segundos para evitar división por cero
    }
    
    // Velocidad media (celdas/segundo)
    this.lastVelocity = this.moveDistance / timeDelta;
    
    // Ángulo del movimiento (en grados)
    this.lastAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    if (this.lastAngle < 0) this.lastAngle += 360;
    
    // Aceleración media (asumiendo aceleración uniforme desde 0)
    // a = 2 * d / t²
    this.lastAcceleration = (2 * this.moveDistance) / (timeDelta * timeDelta);
    
    // Masa equivalente = cantidad de movimientos válidos
    // F = m * a
    this.lastForce = this.validMovesCount * this.lastAcceleration;
    
    // Marcar que tenemos datos de física válidos
    this.hasPhysicsData = true;
    
    console.log(`Física del movimiento:
      distancia=${this.moveDistance.toFixed(2)} celdas, 
      tiempo=${timeDelta.toFixed(2)}s,
      velocidad=${this.lastVelocity.toFixed(2)} celdas/s, 
      ángulo=${this.lastAngle.toFixed(1)}°, 
      aceleración=${this.lastAcceleration.toFixed(2)} celdas/s²,
      masa(movimientos)=${this.validMovesCount},
      fuerza=${this.lastForce.toFixed(2)} N`);
  }

  // Actualizar pantalla de física
  updatePhysicsDisplay() {
    // Actualizar fuerza (F = m * a)
    const forceEl = document.getElementById('force-value');
    if (forceEl) {
      forceEl.textContent = this.lastForce.toFixed(2);
    }
    
    // Actualizar componentes de fuerza
    const forceXEl = document.getElementById('force-x');
    const forceYEl = document.getElementById('force-y');
    if (forceXEl && forceYEl) {
      const forceX = this.lastForce * Math.cos(this.lastAngle * Math.PI / 180);
      const forceY = this.lastForce * Math.sin(this.lastAngle * Math.PI / 180);
      forceXEl.textContent = forceX.toFixed(2);
      forceYEl.textContent = forceY.toFixed(2);
    }
    
    // Actualizar velocidad
    const velocityEl = document.getElementById('velocity-value');
    if (velocityEl) {
      velocityEl.textContent = this.lastVelocity.toFixed(2);
    }
    
    // Actualizar ángulo
    const angleEl = document.getElementById('angle-value');
    if (angleEl) {
      angleEl.textContent = this.lastAngle.toFixed(1) + '°';
    }
    
    // Actualizar aceleración
    const accelValueEl = document.getElementById('acceleration-value');
    if (accelValueEl) {
      accelValueEl.textContent = this.lastAcceleration.toFixed(2);
    }
    
    // Actualizar componentes de aceleración
    const accelXEl = document.getElementById('accel-x');
    const accelYEl = document.getElementById('accel-y');
    if (accelXEl && accelYEl) {
      const accelX = this.lastAcceleration * Math.cos(this.lastAngle * Math.PI / 180);
      const accelY = this.lastAcceleration * Math.sin(this.lastAngle * Math.PI / 180);
      accelXEl.textContent = accelX.toFixed(2);
      accelYEl.textContent = accelY.toFixed(2);
    }
    
    // Actualizar información de pieza seleccionada
    if (this.selectedPiece) {
      const pieceNameEl = document.getElementById('piece-name');
      const pieceMassEl = document.getElementById('piece-mass');
      if (pieceNameEl && pieceMassEl) {
        const typeNames = {
          'peon': 'Peón',
          'caballo': 'Caballo',
          'alfil': 'Alfil',
          'torre': 'Torre',
          'reina': 'Reina',
          'rey': 'Rey'
        };
        const colorName = this.selectedPiece.color === 'blanca' ? 'Blanco' : 'Negro';
        pieceNameEl.textContent = `${typeNames[this.selectedPiece.type]} ${colorName}`;
        
        // Mostrar cantidad de movimientos válidos en lugar de masa
        pieceMassEl.textContent = this.validMovesCount + ' movimientos válidos';
      }
    }
  }
}

// Exportar para uso en navegador
if (typeof window !== 'undefined') {
  window.ChessBoardSimulator = ChessBoardSimulator;
}
