require 'rspec/core/rake_task'

#namespace(:spec) do
  #task :services do
    #Dir.chdir 'services' do
      #system('bundle exec rake spec')
    #end
  #end
#end

#Build the GUI into one index.html in ./gui/public/index.html. ./gui/index.html is a
#symlink to this file
namespace(:gui) do
  task :build do
    Dir.chdir './gui/' do
      require './lib/build'
      Build.run
    end
  end

  task :run => [:build] do
    Dir.chdir './gui/' do
      system('nw .')
    end
  end
end

namespace(:services) do
  task :run do
    Dir.chdir './services' do
      gui_port = ENV['GUI_PORT']
      debug_chrome_ws_port = ENV['DEBUG_CHROME_WS_PORT']
      raise "Set GUI_PORT via GUI_PORT=XXXX" unless gui_port
      raise "Set DEBUG_CHROME_WS_PORT via DEBUG_CHROME_WS_PORT=XXXX" unless debug_chrome_ws_port
      exec('node main.js')
    end
  end
end

RSpec::Core::RakeTask.new(:spec)
