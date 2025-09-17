# Start from a slim Python base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy your custom trading library and the requirements file into the container
COPY Tradehull_V2.py .
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# The command to run when the container starts will be provided by our Node.js server
CMD ["python"]