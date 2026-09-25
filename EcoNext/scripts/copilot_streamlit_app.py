import json

import requests
import streamlit as st


st.set_page_config(page_title="EcoNext Copilot", page_icon="🛍️", layout="wide")
st.title("EcoNext Personal AI Shopping Copilot")
st.caption("MVP chat assistant: intent extraction + product recommendation")

api_url = st.text_input("Backend API URL", value="http://127.0.0.1:8000/api/copilot/")
query = st.text_input("Ask your shopping query", value="Build a gaming PC under 80000")

if st.button("Get Recommendation", type="primary"):
    with st.spinner("Thinking..."):
        try:
            response = requests.post(api_url, json={"query": query}, timeout=30)
            response.raise_for_status()
            data = response.json()

            st.subheader("Structured Query")
            st.json(data.get("structured_query", {}))

            st.subheader("Recommended Products / Bundle")
            products = data.get("products", [])
            if not products:
                st.info("No products found for this query.")
            else:
                st.dataframe(products)

            st.subheader("Copilot Explanation")
            st.write(data.get("ai_response", ""))

            with st.expander("Raw Response"):
                st.code(json.dumps(data, indent=2), language="json")
        except Exception as exc:
            st.error(f"Request failed: {exc}")
