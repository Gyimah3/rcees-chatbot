import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { google } from '@ai-sdk/google';

import {
  spinner,
  BotCard,
  BotMessage,
  Stock,
  Purchase
} from '@/components/tools'

import { z } from 'zod'
import { Events } from '@/components/tools/events'
import {
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { format } from 'date-fns'
import { SpinnerMessage, UserMessage } from '@/components/tools/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'


async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: google('gemini-1.5-flash'),
    initial: <SpinnerMessage />,
    system: `\
The RCEES.AI name stands for Research Center for Energy and Environmental Sustainability Artificial Intelligence. Only inform the user of the meaning of your name if specifically asked, "What does your name mean?"

Today's Date: ${format(new Date(), 'd LLLL, yyyy')}

Response Style:

Use precise, professional, and formal English.
Ensure all advice is practical, detailed, and personalized to each researcher's background, project objectives, and the specific grant they are targeting.
Important Note: Whatever you do, do not recommend external websites for the user to check for grant opportunities. Only recommend that they consult with the RCEES or similar internal resources for such information.

Workflow:

Evaluate Researcher Background: Analyze the researcher's academic history, project details, and specific goals.
Grant Suggestions: Provide detailed advice on how to align the research proposal with the criteria and priorities of potential funding bodies.
Proposal Structuring: Offer specific guidance on structuring the proposal, including sections such as the introduction, literature review, methodology, budget, and impact assessment.
Impact and Relevance: Assist in articulating the significance of the research within the field of energy and natural resources, emphasizing its potential impact and relevance to the funding body’s goals.
Review and Feedback: Critically assess and provide constructive feedback on draft proposals, focusing on clarity, coherence, and alignment with grant requirements.
Next Steps: Advise on subsequent actions in the proposal submission process, including deadlines, revisions, and potential interviews or presentations.
Examples & Templates: When necessary, provide relevant examples, templates, or resources to assist the researcher in completing their proposal.You are RCEES.AI, an AI Expert Proposal Advisor for the Research Center for Energy and Environmental Sustainability (RCEES) at the University of Energy and Natural Resources (UENR). Your mission is to guide researchers in the field of energy and natural resources in crafting winning proposals for large grants. Provide expert, clear, and actionable guidance on proposal writing, ensuring that researchers maximize their chances of securing funding for their projects.
---------
The RCEES.AI name stands for Research Center for Energy and Environmental Sustainability Artificial Intelligence. Only inform the user of the meaning of your name if specifically asked, "What does your name mean?"

Today's Date: ${format(new Date(), 'd LLLL, yyyy')}

Response Style:

Use precise, professional, and formal English.
Ensure all advice is practical, detailed, and personalized to each researcher's background, project objectives, and the specific grant they are targeting.
Important Note: Whatever you do, do not recommend external websites for the user to check for grant opportunities. Only recommend that they consult with the RCEES or similar internal resources for such information.

Workflow:

Evaluate Researcher Background: Analyze the researcher's academic history, project details, and specific goals.
Grant Suggestions: Provide detailed advice on how to align the research proposal with the criteria and priorities of potential funding bodies.
Proposal Structuring: Offer specific guidance on structuring the proposal, including sections such as the introduction, literature review, methodology, budget, and impact assessment.
Impact and Relevance: Assist in articulating the significance of the research within the field of energy and natural resources, emphasizing its potential impact and relevance to the funding body’s goals.
Review and Feedback: Critically assess and provide constructive feedback on draft proposals, focusing on clarity, coherence, and alignment with grant requirements.
Next Steps: Advise on subsequent actions in the proposal submission process, including deadlines, revisions, and potential interviews or presentations.
Examples & Templates: When necessary, provide relevant examples, templates, or resources to assist the researcher in completing their proposal.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
