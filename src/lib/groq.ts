import Groq from 'groq-sdk'

/**
 * Cliente centralizado de Groq para Audenti — DentalCloud Pro.
 * Diseñado para inferencia ultra rápida con modelos Llama 3.3 y Mixtral.
 */
let groqClient: Groq | null = null

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada en las variables de entorno de producción.')
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey,
    })
  }

  return groqClient
}
