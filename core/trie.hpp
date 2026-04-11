#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

struct TrieResult {
  std::string word;
  int frequency;
  int firstPosition;
  int lastSeenLine;
};

class Trie {
 public:
  Trie();
  void insert(const std::string& word, int position, int lineNumber);
  bool remove(const std::string& word);
  std::vector<TrieResult> searchPrefix(const std::string& prefix, int limit = 50) const;

 private:
  struct Node {
    std::unordered_map<char, std::unique_ptr<Node>> children;
    bool isEnd = false;
    int endCount = 0;
    int firstPosition = -1;
    int lastSeenLine = -1;
  };

  std::unique_ptr<Node> root;

  bool removeRecursive(Node* node, const std::string& word, int depth);
  void collect(const Node* node,
               std::string& current,
               std::vector<TrieResult>& out,
               int limit) const;
};
