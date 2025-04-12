import google.generativeai as genai

genai.configure(api_key="AIzaSyBdKeckdj2w7tFj2Ue53N8XNJRW2RhhvqY")

models = genai.list_models()

for model in models:
    print(model.name)
