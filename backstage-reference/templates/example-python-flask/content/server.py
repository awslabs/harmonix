# Importing flask module in the project is mandatory
# An object of Flask class is our WSGI application.
from flask import Flask, render_template
import os
# Flask constructor takes the name of
# current module (__name__) as argument.
app = Flask(__name__)
 
# The route() function of the Flask class is a decorator,
# which tells the application which URL should call
# the associated function.
@app.route('/hello')
# ‘/’ URL is bound with hello_world() function.
def hello_world():
    output = ""
    for name, value in os.environ.items():
        output = output + "{0}: {1} \n".format(name, value)

    return output

@app.route('/')
def index():
    return render_template('index.html')
 
# main driver function
if __name__ == '__main__':
 
    # run() method of Flask class runs the application
    # on the local development server.
    app.run()