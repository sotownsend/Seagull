#Rake tasks
Here are some useful rake tasks:

  * `rake gui:build` - Compiles the `gui` system along with the `services`. You must have compiled the `./app` already.
  * `rake gui:run` - Runs the gui program as a *node-webkit* application.
  * `rake services:run GUI_PORT=NNNN` - Run the services standalone with gui rest on `GUI_PORT`
  * `rake spec` - Run all the spec tests
