#pragma once

#include <vector>

class SegmentTree {
 public:
  explicit SegmentTree(const std::vector<int>& values);
  int query(int left, int right) const;
  void update(int index, int value);

 private:
  int n;
  std::vector<int> tree;

  void build(const std::vector<int>& values, int node, int start, int end);
  int queryInternal(int node, int start, int end, int left, int right) const;
  void updateInternal(int node, int start, int end, int index, int value);
};
