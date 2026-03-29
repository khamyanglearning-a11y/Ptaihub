import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

interface Word {
  id: string
  english: string
  tai: string
  assamese: string
  pronunciation: string
  date_added: string
  status: 'active' | 'deleted'
}

interface Sentence {
  id: string
  english: string
  tai: string
  pronunciation: string
  date_added: string
  status: 'active' | 'deleted'
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

async function getItems<T>(storeName: string): Promise<T[]> {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const existing = await store.get('items', { type: 'json' }) as T[] | null
  return existing || []
}

async function saveItems<T>(storeName: string, items: T[]): Promise<void> {
  const store = getStore({ name: storeName, consistency: 'strong' })
  await store.setJSON('items', items)
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const type = url.searchParams.get('type') // 'words' or 'sentences'

  try {
    // GET - Fetch all data
    if (req.method === 'GET' && action === 'fetch') {
      const words = await getItems<Word>('dictionary-words')
      const sentences = await getItems<Sentence>('dictionary-sentences')

      const activeWords = words.filter(w => w.status === 'active')
        .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
      const activeSentences = sentences.filter(s => s.status === 'active')
        .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())

      return Response.json({ words: activeWords, sentences: activeSentences })
    }

    // POST - Add item
    if (req.method === 'POST' && action === 'add') {
      const body = await req.json()

      if (type === 'words') {
        const words = await getItems<Word>('dictionary-words')
        const newWord: Word = {
          id: generateId(),
          english: body.english,
          tai: body.tai,
          assamese: body.assamese || '',
          pronunciation: body.pronunciation || '',
          date_added: new Date().toISOString(),
          status: 'active',
        }
        words.push(newWord)
        await saveItems('dictionary-words', words)
        return Response.json({ success: true, id: newWord.id })
      }

      if (type === 'sentences') {
        const sentences = await getItems<Sentence>('dictionary-sentences')
        const newSentence: Sentence = {
          id: generateId(),
          english: body.english,
          tai: body.tai,
          pronunciation: body.pronunciation || '',
          date_added: new Date().toISOString(),
          status: 'active',
        }
        sentences.push(newSentence)
        await saveItems('dictionary-sentences', sentences)
        return Response.json({ success: true, id: newSentence.id })
      }

      return Response.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    // PUT - Update item
    if (req.method === 'PUT' && action === 'update') {
      const body = await req.json()
      const id = url.searchParams.get('id')
      if (!id) return Response.json({ success: false, error: 'Missing id' }, { status: 400 })

      const storeName = type === 'words' ? 'dictionary-words' : 'dictionary-sentences'
      const items = await getItems<Word | Sentence>(storeName)
      const index = items.findIndex(item => item.id === id)

      if (index === -1) return Response.json({ success: false, error: 'Item not found' }, { status: 404 })

      items[index] = { ...items[index], ...body, id }
      await saveItems(storeName, items)
      return Response.json({ success: true })
    }

    // DELETE - Soft delete item
    if (req.method === 'DELETE' && action === 'delete') {
      const id = url.searchParams.get('id')
      if (!id) return Response.json({ success: false, error: 'Missing id' }, { status: 400 })

      const storeName = type === 'words' ? 'dictionary-words' : 'dictionary-sentences'
      const items = await getItems<Word | Sentence>(storeName)
      const index = items.findIndex(item => item.id === id)

      if (index === -1) return Response.json({ success: false, error: 'Item not found' }, { status: 404 })

      items[index].status = 'deleted'
      await saveItems(storeName, items)
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Dictionary function error:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const config: Config = {
  path: '/api/dictionary',
}
