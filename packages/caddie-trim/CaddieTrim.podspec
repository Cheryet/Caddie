require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "CaddieTrim"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = package["description"]
  s.license      = "MIT"
  s.author       = { "Caddie" => "noreply@example.com" }
  s.homepage     = "https://example.com/caddie"
  s.source       = { :git => "" }
  s.platforms    = { :ios => "14.0" }
  s.source_files = "ios/**/*.{m,mm,h}"
  s.frameworks   = "AVFoundation", "CoreMedia", "Foundation"
  s.dependency "React-Core"
end
