#pragma once

#include <string>
#include <vector>

class SuffixArray {
 public:
  explicit SuffixArray(const std::string& text);
  std::vector<int> search(const std::string& pattern) const;

 private:
  std::string text;
  std::vector<int> suffixes;

  int compareSuffixWithPattern(int suffixIndex, const std::string& pattern) const;
};
