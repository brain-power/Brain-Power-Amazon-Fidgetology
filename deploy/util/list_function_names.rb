#! /usr/bin/env ruby
require 'json'

# TODO: pipe in or provide filename
list_functions = `aws lambda list-functions`
if $?.exitstatus != 0
  $stderr.puts "List functions failed!"
  exit(1)
end

functions = JSON.load(list_functions)
puts functions["Functions"].map{|fn| fn["FunctionName"]}
