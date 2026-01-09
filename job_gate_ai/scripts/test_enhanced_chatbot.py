import sys
import asyncio
import json
sys.path.insert(0, r'c:\Users\M S I\Desktop\job_gate_ai')

from app.api.endpoints import chatbot
from app.api.endpoints.chatbot import ChatbotStartRequest, ChatbotMessageRequest

async def main():
    print("=" * 60)
    print("Enhanced Chatbot Test")
    print("=" * 60)
    
    # Start a chatbot session
    start_req = ChatbotStartRequest(user_id='test_user', language='english', initial_data={})
    start_res = await chatbot.start_chatbot(start_req)
    print('\n[START] Initial greeting:')
    print(f"Message: {start_res['message']}")
    print(f"Current Step: {start_res['session'].get('current_step')}")
    
    session_id = start_res.get('session_id')
    
    # User provides name
    print("\n" + "=" * 60)
    print("[STEP 1] User provides name and email")
    msg_req1 = ChatbotMessageRequest(session_id=session_id, message='My name is Ali Ahmed and my email is ali.ahmed@mail.com')
    msg_res1 = await chatbot.chat_with_cv_bot(msg_req1)
    print(f"User: My name is Ali Ahmed and my email is ali.ahmed@mail.com")
    print(f"Assistant: {msg_res1['message']}")
    print(f"Current Step: {msg_res1['current_step']}")
    print(f"CV Summary: {msg_res1['cv_data_summary']}")
    
    # User provides experience
    print("\n" + "=" * 60)
    print("[STEP 2] User provides experience")
    msg_req2 = ChatbotMessageRequest(session_id=session_id, message='I was a Software Engineer at Tech Corp from 2020 to 2023. I led a team of 5 developers and improved performance by 40%.')
    msg_res2 = await chatbot.chat_with_cv_bot(msg_req2)
    print(f"User: I was a Software Engineer at Tech Corp...")
    print(f"Assistant: {msg_res2['message']}")
    print(f"Current Step: {msg_res2['current_step']}")
    
    # User provides skills
    print("\n" + "=" * 60)
    print("[STEP 3] User provides skills")
    msg_req3 = ChatbotMessageRequest(session_id=session_id, message='My skills are Python, JavaScript, React, AWS, and Docker')
    msg_res3 = await chatbot.chat_with_cv_bot(msg_req3)
    print(f"User: My skills are Python, JavaScript, React, AWS, and Docker")
    print(f"Assistant: {msg_res3['message']}")
    print(f"CV Summary: {msg_res3['cv_data_summary']}")
    
    # User asks for improvement
    print("\n" + "=" * 60)
    print("[STEP 4] User asks for content improvement")
    msg_req4 = ChatbotMessageRequest(session_id=session_id, message='Can you help me improve my experience description?')
    msg_res4 = await chatbot.chat_with_cv_bot(msg_req4)
    print(f"User: Can you help me improve my experience description?")
    print(f"Assistant: {msg_res4['message']}")
    
    # User asks general question
    print("\n" + "=" * 60)
    print("[STEP 5] User asks general ATS question")
    msg_req5 = ChatbotMessageRequest(session_id=session_id, message='What is ATS and why is it important?')
    msg_res5 = await chatbot.chat_with_cv_bot(msg_req5)
    print(f"User: What is ATS and why is it important?")
    print(f"Assistant: {msg_res5['message']}")

if __name__ == '__main__':
    asyncio.run(main())
