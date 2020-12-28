require "csv"
require 'json'

transfers = Hash.new { |h, k| h[k] = {} }

transfers_csv = File.read(File.join(File.dirname(__FILE__), 'files/transfers.txt'))
csv = CSV.parse(transfers_csv, headers: true)
csv.each do |row|
  if row['from_stop_id'] != row['to_stop_id']
    transfers[row['from_stop_id']][row['to_stop_id']] = row['min_transfer_time'].to_i
  end
end

puts "Writing to JSON file"

file = File.open(File.join(File.dirname(__FILE__), 'transfers.json'), "w")
file.puts transfers.to_json
file.close