QuadTech (Tech Squad)

Imagine Waze and EskomSePush combined.

PROBLEM STATEMENT
Load-shedding doesn’t just cut the lights, it cuts safety. During blackouts, crime spikes and certain areas become high-risk, yet people lack real-time insights into which routes or neighbourhoods are safe. There’s no tool that provides safety forecasts or connects communities to share alerts and stay informed during outages

 

SOLUTION STATEMENT

That’s what gave rise to SafeMzansi

SafeMzansi is an AI-powered public safety tool that predicts and maps the safety level of areas during load-shedding. It provides a “safety forecast”, showing which routes are safer to travel, and integrates community alerts where users can report incidents, share updates, and stay connected in real time.
Think of it as your smart companion for safe navigation and community awareness during the dark.

 

💻 How We Built It

We built safeMzansi using a React  and Tailwind CSS for a modern user interactive frontend and Node js for backend also the Express.js powers the core server logic and hosts our AI model.

Firebase manages user authentication and real-time database storage.


We integrated Gemini API for the AI chatbot, enabling real-time safety insights and user interaction.


Our system leverages multiple Google Maps APIs — including Maps JavaScript, Places, Geocoding, Time Zone, and Routes APIs — to deliver accurate mapping, route safety predictions, and area insights.


To make the safety forecast reliable, we used the EskomSePush API for historical load-shedding data and the SAPS crime dataset for crime pattern analysis.
 