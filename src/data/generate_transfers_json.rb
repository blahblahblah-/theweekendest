require "csv"
require 'json'

transfers = []

transfers_csv = File.read('files/transfers.txt')
csv = CSV.parse(transfers_csv, headers: true)
csv.each do |row|
  if row['from_stop_id'] != row['to_stop_id']
    transfers << {
      from: row['from_stop_id'],
      to: row['to_stop_id']
    }
  end
end

puts "Writing to JSON file"

file = File.open("transfers.json", "w")
file.puts transfers.to_json
file.close