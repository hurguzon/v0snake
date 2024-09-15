import React, { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
}

export function Button({ className = '', variant = 'default', ...props }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variantStyles = variant === 'default' 
    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    />
  )
}