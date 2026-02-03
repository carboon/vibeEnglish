"""
智谱 AI 客户端封装模块
用于封装 zhipuai 官方 SDK
"""

from zhipuai import ZhipuAI


class ZhipuAiClient:
    """智谱 AI 客户端封装类"""
    
    def __init__(self, api_key: str):
        """
        初始化客户端
        
        Args:
            api_key: 智谱 AI API Key
        """
        self.client = ZhipuAI(api_key=api_key)
        self.chat = self.Chat(self.client)
    
    class Chat:
        """Chat 接口封装"""
        
        def __init__(self, client):
            self.client = client
            self.completions = self.Completions(client)
        
        class Completions:
            """Completions 接口封装"""
            
            def __init__(self, client):
                self.client = client
            
            def create(self, model: str, messages: list, **kwargs):
                """
                创建对话补全
                
                Args:
                    model: 模型名称
                    messages: 消息列表
                    **kwargs: 其他参数
                
                Returns:
                    API 响应对象
                """
                return self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs
                )
