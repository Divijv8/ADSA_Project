#include "suffix_array.hpp"

#include <algorithm>

SuffixArray::SuffixArray(const std::string& text) : text(text) {
  suffixes.resize(this->text.size());
  for (int i = 0; i < static_cast<int>(this->text.size()); ++i) {
    suffixes[i] = i;
  }

  std::sort(suffixes.begin(), suffixes.end(), [this](int a, int b) {
    return this->text.substr(a) < this->text.substr(b);
  });
}

int SuffixArray::compareSuffixWithPattern(int suffixIndex, const std::string& pattern) const {
  const int n = static_cast<int>(text.size());
  const int m = static_cast<int>(pattern.size());

  int i = 0;
  while (suffixIndex + i < n && i < m) {
    if (text[suffixIndex + i] < pattern[i]) {
      return -1;
    }
    if (text[suffixIndex + i] > pattern[i]) {
      return 1;
    }
    ++i;
  }

  if (i == m) {
    return 0;
  }

  return -1;
}

std::vector<int> SuffixArray::search(const std::string& pattern) const {
  std::vector<int> matches;
  if (pattern.empty() || text.empty()) {
    return matches;
  }

  int left = 0;
  int right = static_cast<int>(suffixes.size()) - 1;
  int first = -1;

  while (left <= right) {
    const int mid = left + (right - left) / 2;
    const int cmp = compareSuffixWithPattern(suffixes[mid], pattern);
    if (cmp == 0) {
      first = mid;
      right = mid - 1;
    } else if (cmp < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (first == -1) {
    return matches;
  }

  for (int i = first; i < static_cast<int>(suffixes.size()); ++i) {
    const int cmp = compareSuffixWithPattern(suffixes[i], pattern);
    if (cmp != 0) {
      break;
    }
    matches.push_back(suffixes[i]);
  }

  return matches;
}
