let
    Source = Csv.Document(File.Contents("C:\\YOUR_PATH\\player_performance.csv"),[Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    ChangedTypes = Table.TransformColumnTypes(PromotedHeaders,{{"Season", Int64.Type},{"Matches", Int64.Type},{"Runs", Int64.Type},{"BattingAverage", type number},{"StrikeRate", type number},{"Wickets", Int64.Type}})
in
    ChangedTypes
