from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch


class ChatAPITests(APITestCase):
    def test_empty_message_returns_400(self):
        for url in ['/api/chat/', '/api/ai/chat/']:
            response = self.client.post(url, {'message': '   '}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(response.data.get('success'))
            self.assertIn('response', response.data)
            self.assertIn('reply', response.data)

    def test_missing_message_returns_400(self):
        for url in ['/api/chat/', '/api/ai/chat/']:
            response = self.client.post(url, {}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(response.data.get('success'))

    def test_chat_endpoint_mock_success(self):
        with patch('copilot.views.run_chat_pipeline') as mock_pipeline:
            mock_pipeline.return_value = {
                'success': True,
                'response': 'Mock Gemini Response',
                'reply': 'Mock Gemini Response',
                'products': []
            }
            for url in ['/api/chat/', '/api/ai/chat/', '/api/chat', '/api/ai/chat']:
                response = self.client.post(url, {'message': 'Hello'}, format='json')
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertTrue(response.data.get('success'))
                self.assertEqual(response.data.get('response'), 'Mock Gemini Response')
                self.assertEqual(response.data.get('reply'), 'Mock Gemini Response')

    def test_chat_endpoint_query_key_support(self):
        with patch('copilot.views.run_chat_pipeline') as mock_pipeline:
            mock_pipeline.return_value = {
                'success': True,
                'response': 'Query key handled',
                'reply': 'Query key handled',
                'products': []
            }
            response = self.client.post('/api/ai/chat/', {'query': 'Find laptops'}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data.get('success'))
