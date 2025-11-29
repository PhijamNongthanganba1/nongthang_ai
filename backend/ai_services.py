import os
import requests
import base64
import json
from io import BytesIO
from PIL import Image
import time

class AIService:
    def __init__(self):
        self.stability_api_key = os.getenv('STABILITY_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.remove_bg_key = os.getenv('REMOVEBG_API_KEY')
        self.did_api_key = os.getenv('DID_API_KEY')

    # Text to Image using Stability AI
    async def text_to_image(self, prompt, style_preset='digital-art', width=1024, height=1024):
        """Generate image from text using Stability AI"""
        try:
            if not self.stability_api_key:
                # Fallback to Pollinations.ai (free)
                return await self._fallback_text_to_image(prompt, width, height)

            url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
            
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.stability_api_key}"
            }

            payload = {
                "width": width,
                "height": height,
                "text_prompts": [{"text": prompt}],
                "cfg_scale": 7,
                "samples": 1,
                "steps": 30,
                "style_preset": style_preset
            }

            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                image_data = base64.b64decode(data["artifacts"][0]["base64"])
                return self._pil_to_base64(Image.open(BytesIO(image_data)))
            else:
                # Fallback if Stability AI fails
                return await self._fallback_text_to_image(prompt, width, height)

        except Exception as e:
            print(f"Text to Image error: {str(e)}")
            return await self._fallback_text_to_image(prompt, width, height)

    async def _fallback_text_to_image(self, prompt, width=1024, height=1024):
        """Fallback using Pollinations.ai"""
        try:
            # Clean prompt for URL
            clean_prompt = prompt.replace(' ', '%20')
            url = f"https://image.pollinations.ai/prompt/{clean_prompt}?width={width}&height={height}"
            
            response = requests.get(url)
            if response.status_code == 200:
                return base64.b64encode(response.content).decode('utf-8')
            else:
                raise Exception("Fallback service failed")
        except Exception as e:
            print(f"Fallback image generation failed: {str(e)}")
            raise Exception("Image generation service unavailable")

    # Background Removal using Remove.bg
    async def remove_background(self, image_data):
        """Remove background from image using Remove.bg API"""
        try:
            if not self.remove_bg_key:
                # Return original image if no API key
                return image_data

            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            image_bytes = base64.b64decode(image_data)
            
            response = requests.post(
                'https://api.remove.bg/v1.0/removebg',
                files={'image_file': image_bytes},
                data={'size': 'auto'},
                headers={'X-Api-Key': self.remove_bg_key},
            )

            if response.status_code == 200:
                return base64.b64encode(response.content).decode('utf-8')
            else:
                return image_data

        except Exception as e:
            print(f"Background removal error: {str(e)}")
            return image_data

    # Text to Video using D-ID
    async def text_to_video(self, text, image_url=None, voice_type='en_female_1'):
        """Create talking head video from text using D-ID API"""
        try:
            if not self.did_api_key:
                raise Exception("D-ID API key not configured")

            # If no image provided, use a default avatar
            if not image_url:
                image_url = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"

            url = "https://api.d-id.com/talks"
            
            headers = {
                "Authorization": f"Bearer {self.did_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "script": {
                    "type": "text",
                    "input": text,
                    "provider": {
                        "type": "microsoft",
                        "voice_id": voice_type
                    }
                },
                "source_url": image_url,
                "config": {
                    "fluent": "true",
                    "pad_audio": "0.0"
                }
            }

            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == 201:
                talk_id = response.json()["id"]
                
                # Poll for completion
                video_url = await self._poll_video_status(talk_id)
                return video_url
            else:
                raise Exception(f"D-ID API error: {response.text}")

        except Exception as e:
            print(f"Text to Video error: {str(e)}")
            raise Exception("Video generation service unavailable")

    async def _poll_video_status(self, talk_id, max_attempts=30):
        """Poll D-ID API for video completion"""
        url = f"https://api.d-id.com/talks/{talk_id}"
        headers = {"Authorization": f"Bearer {os.getenv('DID_API_KEY')}"}

        for attempt in range(max_attempts):
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                
                if status == "done":
                    return data["result_url"]
                elif status == "error":
                    raise Exception("Video generation failed")
                # else continue polling
            
            time.sleep(2)  # Wait 2 seconds between polls

        raise Exception("Video generation timeout")

    # CV Generation using OpenAI
    async def generate_cv_content(self, user_data, template_type='modern'):
        """Generate professional CV content using OpenAI"""
        try:
            if not self.openai_api_key:
                # Fallback to template-based CV generation
                return await self._template_cv_generation(user_data, template_type)

            prompt = self._create_cv_prompt(user_data, template_type)
            
            headers = {
                "Authorization": f"Bearer {self.openai_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional career advisor and resume writer. Create compelling, professional CV content based on the user's information."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 2000,
                "temperature": 0.7
            }

            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            )

            if response.status_code == 200:
                data = response.json()
                cv_content = data["choices"][0]["message"]["content"]
                return self._parse_cv_content(cv_content, template_type)
            else:
                return await self._template_cv_generation(user_data, template_type)

        except Exception as e:
            print(f"CV generation error: {str(e)}")
            return await self._template_cv_generation(user_data, template_type)

    def _create_cv_prompt(self, user_data, template_type):
        """Create prompt for CV generation"""
        return f"""
        Create a professional CV in {template_type} style with the following information:
        
        Personal Information:
        - Name: {user_data.get('name', '')}
        - Email: {user_data.get('email', '')}
        - Phone: {user_data.get('phone', '')}
        - Location: {user_data.get('location', '')}
        - LinkedIn: {user_data.get('linkedin', '')}
        
        Professional Summary:
        {user_data.get('summary', '')}
        
        Work Experience:
        {user_data.get('experience', '')}
        
        Education:
        {user_data.get('education', '')}
        
        Skills:
        {user_data.get('skills', '')}
        
        Please format this as a professional CV with appropriate sections, bullet points, and professional language.
        Return the content in a structured JSON format.
        """

    async def _template_cv_generation(self, user_data, template_type):
        """Fallback template-based CV generation"""
        cv_template = {
            "personal_info": {
                "name": user_data.get('name', ''),
                "email": user_data.get('email', ''),
                "phone": user_data.get('phone', ''),
                "location": user_data.get('location', ''),
                "linkedin": user_data.get('linkedin', '')
            },
            "professional_summary": user_data.get('summary', 'Experienced professional seeking new opportunities.'),
            "experience": self._format_experience(user_data.get('experience', '')),
            "education": self._format_education(user_data.get('education', '')),
            "skills": self._format_skills(user_data.get('skills', '')),
            "template": template_type
        }
        return cv_template

    def _format_experience(self, experience_text):
        """Format experience text"""
        if isinstance(experience_text, str):
            return [exp.strip() for exp in experience_text.split('\n') if exp.strip()]
        return experience_text or []

    def _format_education(self, education_text):
        """Format education text"""
        if isinstance(education_text, str):
            return [edu.strip() for edu in education_text.split('\n') if edu.strip()]
        return education_text or []

    def _format_skills(self, skills_text):
        """Format skills text"""
        if isinstance(skills_text, str):
            return [skill.strip() for skill in skills_text.split(',') if skill.strip()]
        return skills_text or []

    def _parse_cv_content(self, content, template_type):
        """Parse AI-generated CV content"""
        try:
            # Try to parse as JSON first
            return json.loads(content)
        except:
            # Fallback to template structure
            return {
                "content": content,
                "template": template_type,
                "ai_generated": True
            }

    def _pil_to_base64(self, image):
        """Convert PIL image to base64"""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

# Global AI service instance
ai_service = AIService()