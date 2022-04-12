// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract Todo {
    using Counters for Counters.Counter;
    Counters.Counter internal _taskIds;

    event TaskAdded(address recipient, uint256 taskId, uint256 timestamp);
    event TaskDeleted(uint256 taskId, bool deleted, uint256 timestamp);
    event TaskCompleted(uint256 taskId, bool completed, uint256 timestamp);

    struct Task {
        uint256 id;
        address owner;
        string text;
        bool deleted;
        bool completed;
    }

    mapping(uint256 => address) private taskToOwner;
    mapping(uint256 => Task) private tasks;

    function addTask(
        string memory _text,
        bool _deleted,
        bool _completed
    ) external {
        require(bytes(_text).length != 0, "Invalid text");

        _taskIds.increment();
        uint256 taskId = _taskIds.current();

        Task memory newTask = Task(taskId, msg.sender, _text, _deleted, _completed);

        taskToOwner[taskId] = msg.sender;
        tasks[taskId] = newTask;
        

        emit TaskAdded(msg.sender, taskId, block.timestamp);
    }

    function getTasks() external view returns (Task[] memory) {
        Task[] memory temporary = new Task[](_taskIds.current());
        uint256 counter = 0;
        for (uint256 i = 0; i <= _taskIds.current(); i++) {
            if (taskToOwner[i] == msg.sender && tasks[i].deleted == false) {
                temporary[counter] = tasks[i];
                counter++;
            }
        }

        Task[] memory result = new Task[](counter);
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function deleteTask(uint256 _taskId, bool _isDeleted) external {
        require(taskToOwner[_taskId] == msg.sender, "You're not the owner");

        tasks[_taskId].deleted = _isDeleted;

        emit TaskDeleted(_taskId, _isDeleted, block.timestamp);
    }

    function completeTask(uint256 _taskId, bool _isCompleted) external {
        require(taskToOwner[_taskId] == msg.sender, "You're not the owner");

        tasks[_taskId].completed = _isCompleted;

        emit TaskCompleted(_taskId, _isCompleted, block.timestamp);
    }
}
