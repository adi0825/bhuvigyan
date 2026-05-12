cmake_minimum_required(VERSION 3.10)
project(fraud_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(fraud_engine main.cpp)

install(TARGETS fraud_engine DESTINATION bin)