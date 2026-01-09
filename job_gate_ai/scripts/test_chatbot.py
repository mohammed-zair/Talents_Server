import sys
import asyncio
sys.path.insert(0, r'c:\Users\M S I\Desktop\job_gate_ai')

from app.api.endpoints import chatbot
from app.api.endpoints.chatbot import ChatbotStartRequest, ChatbotMessageRequest

async def main():
    # Start a new chatbot session
    start_req = ChatbotStartRequest(user_id='tester', language='english', initial_data={})
    start_res = await chatbot.start_chatbot(start_req)
    print('Start response:')
    print(start_res)

    session_id = start_res.get('session_id')

    # Send a greeting
    msg_req = ChatbotMessageRequest(session_id=session_id, message='Hi there')
    msg_res = await chatbot.chat_with_cv_bot(msg_req)
    print('\nGreeting response:')
    print(msg_res)

    # Ask to build a CV
    msg_req2 = ChatbotMessageRequest(session_id=session_id, message='I want to build a CV')
    msg_res2 = await chatbot.chat_with_cv_bot(msg_req2)
    print('\nBuild request response:')
    print(msg_res2)

    # Ask about experience tips
    msg_req3 = ChatbotMessageRequest(session_id=session_id, message='How can I improve my experience section?')
    msg_res3 = await chatbot.chat_with_cv_bot(msg_req3)
    print('\nExperience tips response:')
    print(msg_res3)

if __name__ == '__main__':
    asyncio.run(main())
