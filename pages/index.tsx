'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = [number, number]

interface Player {
  snake: Position[]
  direction: Direction
  score: number
}

interface GameState {
  players: { [key: string]: Player }
  food: Position
  roomId: string
}

const GRID_SIZE = 20
const CELL_SIZE = 20

export default function OnlineSnakeGame() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomId, setRoomId] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket')
      const newSocket = io()
      setSocket(newSocket)
    }

    initSocket()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on('gameState', (newGameState: GameState) => {
      setGameState(newGameState)
    })

    socket.on('gameOver', ({ loserId, winnerId }) => {
      setGameOver(true)
      setWinner(winnerId)
    })

    socket.on('roomFull', () => {
      alert('Room is full. Please try another room.')
    })

    return () => {
      socket.off('gameState')
      socket.off('gameOver')
      socket.off('roomFull')
    }
  }, [socket])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!socket || !gameState) return

      let newDirection: Direction
      switch (e.key) {
        case 'ArrowUp':
          newDirection = 'UP'
          break
        case 'ArrowDown':
          newDirection = 'DOWN'
          break
        case 'ArrowLeft':
          newDirection = 'LEFT'
          break
        case 'ArrowRight':
          newDirection = 'RIGHT'
          break
        default:
          return
      }

      socket.emit('updateDirection', { roomId: gameState.roomId, direction: newDirection })
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [socket, gameState])

  const joinGame = useCallback(() => {
    if (socket && roomId) {
      socket.emit('joinGame', roomId)
      setPlayerId(socket.id)
    }
  }, [socket, roomId])

  const resetGame = useCallback(() => {
    setGameState(null)
    setGameOver(false)
    setWinner(null)
    if (socket) {
      socket.emit('joinGame', roomId)
    }
  }, [socket, roomId])

  if (!gameState) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">Online Snake Game</h1>
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="mb-4"
        />
        <Button onClick={joinGame} className="w-full">Join Game</Button>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">Online Snake Game</h1>
      <div className="relative" style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
        {Object.entries(gameState.players).map(([id, player]) => (
          player.snake.map((segment, index) => (
            <div
              key={`${id}-${index}`}
              className={`absolute ${id === playerId ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{
                left: segment[0] * CELL_SIZE,
                top: segment[1] * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          ))
        ))}
        <div
          className="absolute bg-red-500"
          style={{
            left: gameState.food[0] * CELL_SIZE,
            top: gameState.food[1] * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
        />
      </div>
      <div className="mt-4 text-center">
        {Object.entries(gameState.players).map(([id, player]) => (
          <p key={id} className="text-xl font-semibold">
            {id === playerId ? 'You' : 'Opponent'}: {player.score}
          </p>
        ))}
        {gameOver && (
          <div className="mt-4">
            <p className="text-xl font-bold text-red-500 mb-2">
              Game Over! {winner === playerId ? 'You win!' : 'You lose!'}
            </p>
            <Button onClick={resetGame}>Play Again</Button>
          </div>
        )}
      </div>
    </Card>
  )
}