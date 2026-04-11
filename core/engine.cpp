#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <queue>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "segment_tree.hpp"
#include "suffix_array.hpp"
#include "trie.hpp"

namespace {

std::string toLower(const std::string& input) {
  std::string out;
  out.reserve(input.size());
  for (unsigned char c : input) {
    out.push_back(static_cast<char>(std::tolower(c)));
  }
  return out;
}

std::string escapeJson(const std::string& input) {
  std::string out;
  out.reserve(input.size() + 8);
  for (char c : input) {
    switch (c) {
      case '\\':
        out += "\\\\";
        break;
      case '"':
        out += "\\\"";
        break;
      case '\n':
        out += "\\n";
        break;
      case '\r':
        out += "\\r";
        break;
      case '\t':
        out += "\\t";
        break;
      default:
        out.push_back(c);
    }
  }
  return out;
}

std::vector<std::string> readLines(const std::string& filePath) {
  std::vector<std::string> lines;
  std::ifstream file(filePath);
  std::string line;
  while (std::getline(file, line)) {
    lines.push_back(line);
  }
  return lines;
}

bool writeLines(const std::string& filePath, const std::vector<std::string>& lines) {
  std::ofstream file(filePath, std::ios::trunc);
  if (!file.is_open()) {
    return false;
  }

  for (size_t i = 0; i < lines.size(); ++i) {
    file << lines[i];
    if (i + 1 < lines.size()) {
      file << '\n';
    }
  }
  return true;
}

std::vector<std::string> tokenizeWords(const std::string& line) {
  std::vector<std::string> words;
  std::string current;

  for (unsigned char c : line) {
    if (std::isalnum(c) || c == '_') {
      current.push_back(static_cast<char>(std::tolower(c)));
    } else if (!current.empty()) {
      words.push_back(current);
      current.clear();
    }
  }

  if (!current.empty()) {
    words.push_back(current);
  }

  return words;
}

std::string joinLines(const std::vector<std::string>& lines,
                      std::vector<int>& lineStartIndexes,
                      std::vector<std::string>& normalizedLines) {
  std::ostringstream builder;
  int currentIndex = 0;
  lineStartIndexes.reserve(lines.size());
  normalizedLines.reserve(lines.size());

  for (size_t i = 0; i < lines.size(); ++i) {
    const std::string normalized = toLower(lines[i]);
    normalizedLines.push_back(normalized);
    lineStartIndexes.push_back(currentIndex);
    builder << normalized;
    currentIndex += static_cast<int>(normalized.size());
    if (i + 1 < lines.size()) {
      builder << '\n';
      currentIndex += 1;
    }
  }

  return builder.str();
}

int countWordFrequency(const std::string& line, const std::string& word) {
  int count = 0;
  for (const auto& token : tokenizeWords(line)) {
    if (token == word) {
      ++count;
    }
  }
  return count;
}

void printError(const std::string& message) {
  std::cout << "{\"ok\":false,\"error\":\"" << escapeJson(message) << "\"}";
}

void runPrefixSearch(const std::string& query, const std::string& filePath) {
  const auto lines = readLines(filePath);
  Trie trie;

  int absolutePosition = 0;
  for (size_t lineIdx = 0; lineIdx < lines.size(); ++lineIdx) {
    const auto words = tokenizeWords(lines[lineIdx]);
    for (const auto& word : words) {
      trie.insert(word, absolutePosition, static_cast<int>(lineIdx) + 1);
      absolutePosition += static_cast<int>(word.size()) + 1;
    }
  }

  auto matches = trie.searchPrefix(toLower(query), 80);

  std::sort(matches.begin(), matches.end(), [](const TrieResult& a, const TrieResult& b) {
    const double scoreA = a.frequency * 6.0 + a.lastSeenLine * 0.8 - a.firstPosition * 0.0001;
    const double scoreB = b.frequency * 6.0 + b.lastSeenLine * 0.8 - b.firstPosition * 0.0001;
    if (scoreA == scoreB) {
      return a.word < b.word;
    }
    return scoreA > scoreB;
  });

  std::cout << "{\"ok\":true,\"mode\":\"prefix\",\"matches\":[";
  for (size_t i = 0; i < matches.size(); ++i) {
    if (i > 0) {
      std::cout << ',';
    }
    std::cout << "{\"word\":\"" << escapeJson(matches[i].word) << "\",\"frequency\":"
              << matches[i].frequency << ",\"last_line\":" << matches[i].lastSeenLine << "}";
  }
  std::cout << "]}";
}

void runSubstringSearch(const std::string& query, const std::string& filePath) {
  const auto lines = readLines(filePath);
  std::vector<int> lineStartIndexes;
  std::vector<std::string> normalizedLines;
  const std::string fullText = joinLines(lines, lineStartIndexes, normalizedLines);

  SuffixArray suffixArray(fullText);
  const std::string normalizedQuery = toLower(query);
  const auto positions = suffixArray.search(normalizedQuery);

  struct LineHit {
    int lineNumber = 0;
    int firstIndex = 0;
    int hits = 0;
    double score = 0.0;
  };

  std::unordered_map<int, LineHit> lineHits;
  for (int pos : positions) {
    const auto upper = std::upper_bound(lineStartIndexes.begin(), lineStartIndexes.end(), pos);
    if (upper == lineStartIndexes.begin()) {
      continue;
    }

    const int lineIndex = static_cast<int>(std::distance(lineStartIndexes.begin(), upper)) - 1;
    if (lineIndex < 0 || lineIndex >= static_cast<int>(normalizedLines.size())) {
      continue;
    }

    const int inLineIndex = pos - lineStartIndexes[lineIndex];
    auto& hit = lineHits[lineIndex];
    hit.lineNumber = lineIndex + 1;
    hit.hits += 1;
    if (hit.hits == 1 || inLineIndex < hit.firstIndex) {
      hit.firstIndex = std::max(0, inLineIndex);
    }
  }

  struct RankedLine {
    LineHit hit;
    bool operator<(const RankedLine& other) const { return hit.score < other.hit.score; }
  };

  std::priority_queue<RankedLine> pq;
  for (auto& pair : lineHits) {
    auto& hit = pair.second;
    const double recency = static_cast<double>(hit.lineNumber) / std::max(1, static_cast<int>(lines.size()));
    const double positionScore = 1.0 / (1 + hit.firstIndex);
    hit.score = hit.hits * 5.0 + recency * 2.0 + positionScore;
    pq.push({hit});
  }

  std::cout << "{\"ok\":true,\"mode\":\"substring\",\"matches\":[";
  bool first = true;
  while (!pq.empty()) {
    const auto ranked = pq.top();
    pq.pop();

    if (!first) {
      std::cout << ',';
    }
    first = false;

    std::string preview;
    if (ranked.hit.lineNumber - 1 < static_cast<int>(lines.size()) && ranked.hit.lineNumber > 0) {
      preview = lines[ranked.hit.lineNumber - 1];
      if (preview.size() > 120) {
        preview = preview.substr(0, 120) + "...";
      }
    }

    std::cout << "{\"line_number\":" << ranked.hit.lineNumber << ",\"index\":" << ranked.hit.firstIndex
              << ",\"hits\":" << ranked.hit.hits << ",\"score\":" << ranked.hit.score
              << ",\"preview\":\"" << escapeJson(preview) << "\"}";
  }
  std::cout << "]}";
}

void runAnalytics(const std::string& word, int left, int right, const std::string& filePath) {
  const auto lines = readLines(filePath);
  if (lines.empty()) {
    std::cout << "{\"ok\":true,\"frequency\":0,\"range\":[0,0]}";
    return;
  }

  const std::string normalizedWord = toLower(word);
  std::vector<int> frequencyPerLine;
  frequencyPerLine.reserve(lines.size());

  for (const auto& line : lines) {
    frequencyPerLine.push_back(countWordFrequency(toLower(line), normalizedWord));
  }

  SegmentTree tree(frequencyPerLine);

  left = std::max(1, left);
  right = std::min(static_cast<int>(lines.size()), right);
  if (left > right) {
    std::swap(left, right);
  }

  const int frequency = tree.query(left - 1, right - 1);
  std::cout << "{\"ok\":true,\"word\":\"" << escapeJson(normalizedWord)
            << "\",\"range\":[" << left << ',' << right << "],\"frequency\":" << frequency << "}";
}

void runUpdate(int lineNumber, const std::string& newContent, const std::string& filePath) {
  auto lines = readLines(filePath);
  if (lineNumber < 1 || lineNumber > static_cast<int>(lines.size())) {
    printError("line_number out of range");
    return;
  }

  lines[lineNumber - 1] = newContent;
  const bool saved = writeLines(filePath, lines);
  if (!saved) {
    printError("unable to persist updated file");
    return;
  }

  std::cout << "{\"ok\":true,\"status\":\"updated\",\"line_number\":" << lineNumber
            << ",\"reindex\":\"partial_reindex_applied\"}";
}

}  // namespace

int main(int argc, char* argv[]) {
  if (argc < 2) {
    printError("missing command");
    return 1;
  }

  const std::string command = argv[1];

  if (command == "search") {
    if (argc < 5) {
      printError("usage: engine search <prefix|substring> <query> <file_path>");
      return 1;
    }

    const std::string mode = argv[2];
    const std::string query = argv[3];
    const std::string filePath = argv[4];

    if (mode == "prefix") {
      runPrefixSearch(query, filePath);
      return 0;
    }

    if (mode == "substring") {
      runSubstringSearch(query, filePath);
      return 0;
    }

    printError("unsupported search mode");
    return 1;
  }

  if (command == "analytics") {
    if (argc < 6) {
      printError("usage: engine analytics <word> <l> <r> <file_path>");
      return 1;
    }

    const std::string word = argv[2];
    const int left = std::stoi(argv[3]);
    const int right = std::stoi(argv[4]);
    const std::string filePath = argv[5];

    runAnalytics(word, left, right, filePath);
    return 0;
  }

  if (command == "update") {
    if (argc < 5) {
      printError("usage: engine update <line_number> <new_content> <file_path>");
      return 1;
    }

    const int lineNumber = std::stoi(argv[2]);
    const std::string newContent = argv[3];
    const std::string filePath = argv[4];

    runUpdate(lineNumber, newContent, filePath);
    return 0;
  }

  if (command == "health") {
    std::cout << "{\"ok\":true,\"service\":\"engine\"}";
    return 0;
  }

  printError("unknown command");
  return 1;
}
