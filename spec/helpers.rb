require 'Open3'
require 'net/http'
require 'uri'
require 'json'

#Services configuration
GUI_PORT=3333
DEBUG_CHROME_WS_PORT=4444 #The port WebSocket clients connect to (liek chrome)

module SpecHelpers
#Run a command from a list of arguments, the last argument, if it is a Regexp,
#will be waited_for before executing the block.
def sh *args, &block
  #If the last argument is a regular expression, wait for that regular expression
  #before executing the block
  if args.last.class == Regexp
    wait_for = args.pop
  end

  #Keep track of when we are done because the stderr and stdout repeater
  #will throw an exception which we can ignore at that point
  finished = false

  #Keep track of when we are done finished waiting so we can signal that we never
  #finished waiting if the timeout occurrs. Also keep track of the waiting stdout
  #and stderr messages to display in the timeout during waiting exception
  finished_waiting = false
  waiting_out = StringIO.new

  #Start the command, at this poiunt, we poped the regular experssion if there was one
  Open3.popen3 *args do |inp, out, err, t|
    pid = t[:pid] #Capture pid now as it will be unavailable later
    begin
      Timeout::timeout(10) do
        #Always Report the $stderr async
        Thread.new do
          begin
            loop do
              $stderr.puts err.readline
            end
          rescue => e
            next if finished #Pipe was already closed by Process.kill in ensure
            $stderr.puts "[#{str.inspect} threw an exception]: #{e}"
          end
        end

        #Should we wait to execute the block until something appears on stdout?
        if wait_for
          raise "wait_for given for chrome #{code.inspect} must be a regex. You passed #{wait_for.inspect}" unless wait_for.class == Regexp
          begin
            loop do
              wait_for_res = out.readline
              waiting_out << wait_for_res
              break if wait_for_res =~ wait_for
            end
          rescue EOFError
            msg = StringIO.new
            msg.puts "While waiting for command #{args[0].inspect} for #{wait_for.inspect}, the command closed the pipe (it terminated) and returned:"
            msg.puts "-"*100 << "\n"
            msg.puts  waiting_out.string
            msg.puts "-"*100
            raise msg.string
          end
        end
      end

      #Done waiting, timeout is no longer a problem
      finished_waiting = true

      #Report stdout now
      Thread.new do
        begin
          loop do
            $stderr.puts out.readline
          end
        rescue => e
          next if finished #Pipe was already closed by Process.kill in ensure
          $stderr.puts "[#{str.inspect} threw an exception]: #{e}"
        end
      end

      #Execute the block
      block.call
    rescue Timeout::Error
      if finished_waiting
        raise "Timeout for command #{args[0].inspect} during executing your ruby block"
      else
        msg = StringIO.new
        msg.puts "Timeout for command #{args[0].inspect} while waiting for #{wait_for.inspect} received:"
        msg.puts "-"*100 << "\n"
        msg.puts  waiting_out.string
        msg.puts "-"*100
        raise msg.string
      end
    ensure
      #Kill the process when the block is finished executing
      begin
        finished = true
        Process.kill :INT, pid
      rescue Errno::ESRCH
      end
    end
  end
end

#Alot like sh but instead of outputting the stdout, it allows you to read it through the block
def sh2 *args
  #If the last argument is a regular expression, wait for that regular expression
  #before executing the block
  if args.last.class == Regexp
    wait_for = args.pop
  end

  #Keep track of when we are done because the stderr and stdout repeater
  #will throw an exception which we can ignore at that point
  finished = false

  #Keep track of when we are done finished waiting so we can signal that we never
  #finished waiting if the timeout occurrs. Also keep track of the waiting stdout
  #and stderr messages to display in the timeout during waiting exception
  finished_waiting = false
  waiting_out = StringIO.new

  #Start the command, at this poiunt, we poped the regular experssion if there was one
  Open3.popen3 *args do |inp, out, err, t|
    pid = t[:pid] #Capture pid now as it will be unavailable later
    begin
      Timeout::timeout(10) do
        #Always Report the $stderr async
        Thread.new do
          begin
            loop do
              $stderr.puts err.readline
            end
          rescue => e
            next if finished #Pipe was already closed by Process.kill in ensure
            $stderr.puts "[#{str.inspect} threw an exception]: #{e}"
          end
        end

        #Should we wait to execute the block until something appears on stdout?
        if wait_for
          raise "wait_for given for chrome #{code.inspect} must be a regex. You passed #{wait_for.inspect}" unless wait_for.class == Regexp
          begin
            loop do
              wait_for_res = out.readline
              waiting_out << wait_for_res
              break if wait_for_res =~ wait_for
            end
          rescue EOFError
            msg = StringIO.new
            msg.puts "While waiting for command #{args[0].inspect} for #{wait_for.inspect}, the command closed the pipe (it terminated) and returned:"
            msg.puts "-"*100 << "\n"
            msg.puts  waiting_out.string
            msg.puts "-"*100
            raise msg.string
          end
        end
      end

      #Done waiting, timeout is no longer a problem
      finished_waiting = true

      #Execute the block
      yield out
    rescue Timeout::Error
      if finished_waiting
        raise "Timeout for command #{args[0].inspect} during executing your ruby block"
      else
        msg = StringIO.new
        msg.puts "Timeout for command #{args[0].inspect} while waiting for #{wait_for.inspect} received:"
        msg.puts "-"*100 << "\n"
        msg.puts  waiting_out.string
        msg.puts "-"*100
        raise msg.string
      end
    ensure
      #Kill the process when the block is finished executing
      begin
        finished = true
        Process.kill :INT, pid
      rescue Errno::ESRCH
      end
    end
  end
end

#Execute some chrome code
def chrome code, wait_for
  #Load js assets
  js_assets = Dir["./spec/assets/*.js"]
  f = Tempfile.new(SecureRandom.hex)
  js_assets.each do |fn|
    f.puts File.read(fn)
  end

  f.puts code
  f.close
  sh "boojs", f.path, wait_for do
    yield
  end
end

#Get the result at an endpoint
def get endpoint
  uri = URI.parse(endpoint)
  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Get.new(uri.request_uri)
  response = http.request(request)

  return JSON.parse(response.body)
end
end


