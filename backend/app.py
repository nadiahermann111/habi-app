from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return {'message': 'Habi API działa!'}

@app.route('/api/test')
def test():
    return {'status': 'OK', 'message': 'Backend połączony'}

if __name__ == '__main__':
    app.run(debug=True)